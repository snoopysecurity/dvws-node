const graphql = require('graphql');
const _ = require('lodash')
const jwt = require('jsonwebtoken')
var fsPromise = require("fs").promises;
const { GraphQLObjectType, GraphQLString, GraphQLID, GraphQLBoolean, GraphQLList, GraphQLSchema, GraphQLNonNull } = graphql;


const Note = require('../models/notebook');
const User = require('../models/users');

const options = {
  expiresIn: '2d',
  issuer: 'https://github.com/snoopysecurity',
  algorithms: ["HS256", "none"],
  ignoreExpiration: true
};

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
      type: { type: new GraphQLList(GraphQLString)},
      no: { type: GraphQLString }
  })
});


const FileType = new GraphQLObjectType({
  name: 'File',
  fields: ( ) => ({
      id: { type: GraphQLID },
      filePath: { type: new GraphQLNonNull(GraphQLString) },
      fileContent: { type: new GraphQLNonNull(GraphQLString) }
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
    result = await Note.find({ name: note }, 'name body user _id type').exec();
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
        return result;

      } 
},
  }
});


const Mutation = new GraphQLObjectType({
  name: 'Mutations',
  fields: {
    createNote: {
      type: new GraphQLList(NoteType),
      args: {name:{type: GraphQLString},
      body: { type: GraphQLString },
      type: { type: new GraphQLList(GraphQLString)}},
      async resolve(parent, args, req){
    
      let result = {}
      try {
        const token = req.headers.authorization.split(' ')[1]; // Bearer <token>
        result = jwt.verify(token, process.env.JWT_SECRET, options);

      } catch (error) {
        throw new Error( "Missing JWT Auth Token");
      }
   
        var new_note = new Note({ name: args.name , body: args.body, type: args.type, user: result.user});
        new_note.save(function (err, note) {
          if (err) {
            throw new Error(err);
          }
        }); 
        result = await Note.find({ name: args.name }, 'name body user _id type').exec();
        return result;

      }
      },
      updateUserUploadFile: {
        type: FileType,
        args: {
          filePath: { type: new GraphQLNonNull(GraphQLString) },
          fileContent: { type: new GraphQLNonNull(GraphQLString) },
      },
      async resolve(parent, args, req){

        try {
          const token = req.headers.authorization.split(' ')[1]; // Bearer <token>
          result = jwt.verify(token, process.env.JWT_SECRET, options);
        } catch (error) {
          throw new Error( "Missing JWT Admin Auth Token");
        }
        
        UpdatedFile = {}
        filePath = __dirname + '/../public/uploads/' + result.user + "/" +  args.filePath;
        await fsPromise.writeFile(filePath, args.fileContent);
        UpdatedFile['filePath'] = filePath
        UpdatedFile['fileContent'] = args.fileContent
        return UpdatedFile;

      }
    }

  }



})

module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation
});

