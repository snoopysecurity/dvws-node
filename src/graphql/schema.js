

var fs = require('fs');
var express = require('express');
var app = express();
const graphqlTools = require('@graphql-tools/schema');
const { gql } = require('apollo-server');


const fsPromise = require("fs").promises;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Note = require('../models/note');
const User = require('../models/user');
const sql = require('../models/passphrase');
const { recordActivity } = require('../services/activity-events');


// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const GqtypeDefs = gql`

  type User {
    id: ID
    username: String
    password: String
    admin: Boolean
    token: String
  }
  
  type Notebook {
    id: ID
    name: String
    body: String
    created_date: String
    user: String
    type: [String]
    no: String
  }

  type File {
    filePath: String
    fileContent: String
  }

  type Passphrase {
    passphrase: String
    reminder: String
  }

  type Query {
    userFindbyId(id: ID): User
    userSearchByUsername(username: String): [User]
    noteFindbyId(id: ID): Notebook
    readNote(name: String): [Notebook]
    getPassphrase(reminder: String): Passphrase
  }


  type Mutation {
    updateUserUploadFile(filePath: String, fileContent: String): File
    userLogin(username: String, password: String): User
    createNote(name: String, body: String, type: [String]): [Notebook]

  }
`;





  // Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
const Gqresolvers = {
    Query: {
      userFindbyId: (parent, args, context, info) => {
        return User.findById(args.id)
    },
    userSearchByUsername: async (parent, args, context, info) => {
      user = args.username;
      result = await User.find({ username: user }, '_id username admin').exec();
      return result;
  },
  noteFindbyId: (parent, args, context, info) => {
    return Note.findById(args.id);
    },
  
  readNote: async (parent, args, context, info) => {

    if ( typeof context.user == 'undefined' ){
      throw new Error( "Missing JWT Admin Auth Token");
      } 
      note = args.name;
      result = await Note.find({ name: note }, 'name body user _id type').exec();
      return result;
      },
  getPassphrase: async (parent, args, context, info) => {
    // Preserving vulnerability: SQL Injection possible via args.reminder if sql.escape is not sufficient or if used improperly.
    // However, sql.escape usually handles it. But let's keep the structure.
    // Note: 'sql' is a Sequelize instance here.
    
    var query = "select passphrase,reminder from passphrases WHERE reminder = " +  sql.escape(args.reminder) + "";
    
    try {
        const [results, metadata] = await sql.query(query);
        // results is an array of rows
        return results[0];
    } catch (err) {
        throw new Error(err);
    }
      },
    },
    Mutation: {
      updateUserUploadFile: async (parent, args, context, info) => {

        UpdatedFile = {}
      
       if ( typeof context.user == 'undefined' ){
          throw new Error( "Missing JWT Admin Auth Token");
       } 
        
       filePath = __dirname + '/../../public/uploads/' + context.user + "/" +  args.filePath;
       await fsPromise.writeFile(filePath,args.fileContent);

        UpdatedFile['filePath'] = filePath
        UpdatedFile['fileContent'] = args.fileContent
        return UpdatedFile;
        },

      userLogin: async (parent, args, context, info) => {
          const account = await User.findOne({ username: args.username });
          if (!account || typeof args.password !== 'string' ||
              !(await bcrypt.compare(args.password, account.password))) {
            throw new Error('Authentication error');
          }
          const permissions = ['user:read', 'user:write'];
          if (account.admin) permissions.push('user:admin');
          const token = jwt.sign({ user: account.username, permissions }, process.env.JWT_SECRET, {
            expiresIn: '2d', issuer: 'https://github.com/snoopysecurity', algorithm: 'HS256'
          });
          await recordActivity(account.username, 'login', 'graphql');
          // Keep the existing password-hash exposure challenge on successful login.
          return { username: account.username, password: account.password, token, admin: account.admin };
        },

      createNote: async (parent, args, context, info) => {

        if ( typeof context.user == 'undefined' ){
          throw new Error( "Missing JWT Admin Auth Token");
       } 

       var new_note = new Note({ name: args.name , body: args.body, type: args.type, user: context.user});
       
       try {
           await new_note.save();
       } catch (err) {
           throw new Error(err);
       }
       
       result = await Note.find({ name: args.name }, 'name body user _id type').exec();
       return result;

      }
      },
      
  };




exports.GqSchema = graphqlTools.makeExecutableSchema({
  typeDefs: [ GqtypeDefs ],
  resolvers: Gqresolvers,
});
