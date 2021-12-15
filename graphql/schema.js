

var fs = require('fs');
var express = require('express');
var app = express();
const graphqlTools = require('@graphql-tools/schema');
const { gql } = require('apollo-server');


const fsPromise = require("fs").promises;
const bcrypt = require('bcrypt');
const Note = require('../models/notebook');
const User = require('../models/users');



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


  type Query {
    userFindbyId(id: ID): User
    userSearchByUsername(username: String): [User]
    noteFindbyId(id: ID): Notebook
    readNote(name: String): [Notebook]
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
      note = args.name;
      result = await Note.find({ name: note }, 'name body user _id type').exec();
      return result;
      }
  

    },
    Mutation: {
      updateUserUploadFile: async (parent, args, context, info) => {

        UpdatedFile = {}
      
       if ( typeof context.user == 'undefined' ){
          throw new Error( "Missing JWT Admin Auth Token");
       } 
        
       filePath = __dirname + '/../public/uploads/' + context.user + "/" +  args.filePath;
       await fsPromise.writeFile(filePath,args.fileContent);

        UpdatedFile['filePath'] = filePath
        UpdatedFile['fileContent'] = args.fileContent
        return UpdatedFile;
        },

      userLogin: async (parent, args, context, info) => {

          let returnVar = {};
          var argsusername = args.username;
          var argspassword = args.password;
    
          result =  await User.find({ username: argsusername }, 'username password').exec();
          if( result.length == 0 ) {
            throw new Error( "User Login Failed");
          }
          console.log(result);
          returnVar['username'] = result[0].username;
          returnVar['password'] = result[0].password;
    
          returnval = passwordCompare(argspassword,result);
          token = await returnval.then(function(token) {
            returnVar['token'] = token;
          })
          return returnVar;

        },

      createNote: async (parent, args, context, info) => {

        if ( typeof context.user == 'undefined' ){
          throw new Error( "Missing JWT Admin Auth Token");
       } 

       var new_note = new Note({ name: args.name , body: args.body, type: args.type, user: context.user});
       new_note.save(function (err, note) {
         if (err) {
           throw new Error(err);
         }
       }); 
       result = await Note.find({ name: args.name }, 'name body user _id type').exec();
       console.log(result);
       return result;

      }
      },
      
  };




function passwordCompare(argspassword,dbresult) {
  user = dbresult[0].username;
  dbtoken = bcrypt.compare(argspassword, dbresult[0].password).then(match => {
    if (match) {

      if (user.admin == true) {
        const payload = { user: dbresult[0].username,"permissions": [
          "user:read",
          "user:write",
          "user:admin"
        ] };
        const options = { expiresIn: '2d', issuer: 'https://github.com/snoopysecurity', algorithm: "HS256"};
        const secret = process.env.JWT_SECRET;
        const token = jwt.sign(payload, secret, options);
        

        return token;
      } else {

        const payload = { user: dbresult[0].username,"permissions": [
          "user:read",
          "user:write"
        ] };
        const options = { expiresIn: '2d', issuer: 'https://github.com/snoopysecurity', algorithm: "HS256"};
        const secret = process.env.JWT_SECRET;
        const token = jwt.sign(payload, secret, options);

        return token;       }
    } else {
      throw new Error( "Authentication error");
      return result;
    }

  }).catch(err => {
    dbtoken= err;
  });
  return dbtoken;

}

exports.GqSchema = graphqlTools.makeExecutableSchema({
  typeDefs: [ GqtypeDefs ],
  resolvers: Gqresolvers,
});
