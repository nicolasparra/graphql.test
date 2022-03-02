import { ApolloServer, UserInputError ,gql, AuthenticationError } from "apollo-server";
import './db.js';
import Person from "./models/person.js";
import User from "./models/user.js";
import jwt from "jsonwebtoken";

const JWT_SECRET_KEY=process.env.JWT_SECRET_KEY || "S3CR3TK3y"

const typeDefinitions = gql`
  enum YesNo {
    YES
    NO
  }

  type Address {
    street: String!
    city: String!
  }

  type Person {
    name: String!
    phone: String
    address: Address!
    id: ID!
  }

  type User {
    userName: String!
    friends: [Person]!
    id: ID! 
  }

  type Token {
    value: String!
  }

  type Query {
    personCount: Int!
    allPersons(phone: YesNo): [Person]!
    findPerson(name: String): Person
    me: User
  }

  type Mutation {
    addPerson(
      name: String!
      phone: String
      street: String!
      city: String!
    ): Person
    editNumber(
      name: String!
      phone: String!
    ): Person
    createUser(
      userName: String!
    ): User
    login(
      userName: String!
      password: String!
    ): Token
    addAsFriend(
      name: String!
    ): User
  }
`;

const resolvers = {
  Query: {
    personCount: () => Person.collection.countDocuments(),
    allPersons: async (root,args) => {
      if (!args.phone) return Person.find({});
      return Person.find({phone:{$exists:args.phone == 'YES'}});
    },
    findPerson: async (root, args) => {
      const { name } = args;
      const person = await Person.findOne({name});
      return person;
    },
    me: (root,args,context) => {
      return context.currentUser
    }
  },
  Mutation:{
    addPerson: async (root,args,context)=>{
      const {currentUser} = context;
      if(!currentUser) throw new AuthenticationError('not Authenticated');
      
      const person = new Person({...args});
      try {
        await person.save();
        currentUser.friends = currentUser.friends.concat(person);
        await currentUser.save();
        return person;
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        })
      }
    },
    editNumber: async (root,args) => {
      const person = await Person.findOne({name:args.name});
      if(!person) return;
      try {
        person.phone = args.phone;
        await person.save();
      } catch (error) {
        throw new UserInputError(error.message,{invalidArgs:args});
      }
      return person;
    },
    createUser: async (root,args) => {
      const user = new User({...args});

      return user.save().catch(error=>{
        throw new Error(UserInputError(error.message,{
          invalidArgs: args
        }));
      });
    },
    login : async (root,args) => {
      const user = await User.findOne({userName:args.userName});

      if(!user || args.password!='secret'){
        throw new UserInputError('wrong credentials')
      }

      const userToken = {
        username: user.userName,
        id: user._id
      }

      return {
        value: jwt.sign(userToken,JWT_SECRET_KEY)
      }
    },
    addAsFriend: async (root,args,{currentUser}) =>{
      if(!currentUser) throw new AuthenticationError('not Authenticated');

      const person = await Person.findOne({name:args.name});
      if(!person) throw new UserInputError('invalid name');

      const nonFriendlyAlready = person => !currentUser.friends
        .map(p=>p._id)
        .includes(person._id);

      if(nonFriendlyAlready(person)){
        currentUser.friends = currentUser.friends.concat(person);
        await currentUser.save();
      }

      return currentUser;
    }
  },
  Person: {
    address: (root) => {
      return { street: root.street, city: root.city };
    },
  },
};

const server = new ApolloServer({
  typeDefs: typeDefinitions,
  resolvers,
  context: async ({req})=>{
    const auth = req ? req.headers.authorization : null
    if(auth && auth.toLocaleLowerCase().startsWith('bearer')){

      const token = auth.substring(7);
      const {id} = jwt.verify(token,JWT_SECRET_KEY);
      const currentUser = await User.findById(id).populate('friends');
      return {currentUser}
    }
  }
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
