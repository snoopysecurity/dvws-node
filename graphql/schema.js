const graphql = require('graphql');
const _ = require('lodash')

const { GraphQLObjectType, GraphQLString, GraphQLID, GraphQLBoolean, GraphQLList, GraphQLSchema } = graphql;


const Note = require('../models/notebook');
const User = require('../models/users');


const UserType = new GraphQLObjectType({
  name: 'User',
  fields: ( ) => ({
      id: { type: GraphQLID },
      username: { type: GraphQLString },
      password: { type: GraphQLString },
      admin: { type: GraphQLBoolean }
  })
});


const NoteType = new GraphQLObjectType({
  name: 'Note',
  fields: ( ) => ({
      id: { type: GraphQLID },
      name: { type: GraphQLString },
      body: { type: GraphQLString },
      created_date: { type: GraphQLString },
      user: { type: GraphQLString },
      no: { type: GraphQLString }
  })
});


const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
      status: {
          type: GraphQLString,
          resolve(parent, args){
              return "Welcome to DVWS GraphQL"
          }
      },
    noteFindbyId: {
      type: NoteType,
      args: {id:{type: GraphQLID}},
      resolve(parent,args){
        return Note.findById(args.id)
      }
  },
  readNote: {
  type: new GraphQLList(NoteType),
  args: {name:{type: GraphQLString}},
  async resolve(parent,args){
    note = args.name;
    result = await Note.find({ name: note }, 'name body user _id').exec();
    return result;

  } 
},
  userFindbyId: {
    type: UserType,
    args: {id:{type: GraphQLID}},
    resolve(parent,args){
      return User.findById(args.id)
    }
  },
  userSearchByUsername: {
      type: new GraphQLList(UserType),
      args: {username:{type: GraphQLString}},
      async resolve(parent,args){
        user = args.username;
        result = await User.find({ username: user }, '_id username admin').exec();
        console.log(result)
        return result;

      } 
},
  }
});

module.exports = new GraphQLSchema({
  query: RootQuery
});
