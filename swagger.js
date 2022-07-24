module.exports = {
  "openapi": "3.0.1",
  "info": {
    "title": "DVWS API",
    "description": "API Used for DVWS Application",
    "version": "0.1"
  },
  "servers": [{
    "url": "http://dvws.local"
  }],
  "paths": {
    "/api/v2/notes/{ID}": {
      "put": {
        "description": "Auto generated using Swagger Inspector",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/body"
              },
              "examples": {
                "0": {
                  "value": "{\"name\":\"test\",\"body\":\"xxfoobarx\",\"type\":\"note\"}"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Auto generated using Swagger Inspector",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "type": "string"
                },
                "examples": {}
              }
            }
          }
        },
        "servers": [{
          "url": "http://dvws.local"
        }]
      },
      "delete": {
        "description": "Auto generated using Swagger Inspector",
        "responses": {
          "200": {
            "description": "Auto generated using Swagger Inspector",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "type": "string"
                },
                "examples": {}
              }
            }
          }
        },
        "servers": [{
          "url": "http://dvws.local"
        }]
      },
      "servers": [{
        "url": "http://dvws.local"
      }]
    },
    "/api/v2/info": {
      "get": {
        "description": "Auto generated using Swagger Inspector",
        "responses": {
          "403": {
            "description": "Auto generated using Swagger Inspector",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "type": "string"
                },
                "examples": {}
              }
            }
          }
        },
        "servers": [{
          "url": "http://dvws.local"
        }]
      },
      "servers": [{
        "url": "http://dvws.local"
      }]
    },
    "/api/v2/notes": {
      "post": {
        "description": "Auto generated using Swagger Inspector",
        "requestBody": {
          "content": {
            "application/json;charset=utf-8": {
              "schema": {
                "type": "string"
              },
              "examples": {
                "0": {
                  "value": "{\"name\":\"test\",\"body\":\"xxx\",\"type\":\"note\"}"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Auto generated using Swagger Inspector",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "type": "string"
                },
                "examples": {}
              }
            }
          }
        },
        "servers": [{
          "url": "http://dvws.local"
        }]
      },
      "servers": [{
        "url": "http://dvws.local"
      }]
    },
    "/api/v1/info": {
      "get": {
        "description": "Auto generated using Swagger Inspector",
        "responses": {
          "200": {
            "description": "Auto generated using Swagger Inspector"
          }
        },
        "servers": [{
          "url": "http://dvws.local"
        }]
      },
      "servers": [{
        "url": "http://dvws.local"
      }]
    },
    "/api/v2/login": {
      "post": {
        "description": "Auto generated using Swagger Inspector",
        "requestBody": {
          "content": {
            "application/x-www-form-urlencoded": {
              "schema": {
                "type": "string"
              },
              "examples": {
                "0": {
                  "value": "username=xxx&password=xxx"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Auto generated using Swagger Inspector",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "type": "string"
                },
                "examples": {}
              }
            }
          }
        },
        "servers": [{
          "url": "http://dvws.local"
        }]
      },
      "servers": [{
        "url": "http://dvws.local"
      }]
    },
    "/api/v2/users": {
      "post": {
        "description": "Auto generated using Swagger Inspector",
        "requestBody": {
          "content": {
            "application/x-www-form-urlencoded": {
              "schema": {
                "type": "string"
              },
              "examples": {
                "0": {
                  "value": "username=xxx&password=xxx"
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Auto generated using Swagger Inspector",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "type": "string"
                },
                "examples": {}
              }
            }
          }
        },
        "servers": [{
          "url": "http://dvws.local"
        }]
      },
      "get": {
        "description": "Auto generated using Swagger Inspector",
        "responses": {
          "200": {
            "description": "Auto generated using Swagger Inspector",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "type": "string"
                },
                "examples": {}
              }
            }
          }
        },
        "servers": [{
          "url": "http://dvws.local"
        }]
      },
      "servers": [{
        "url": "http://dvws.local"
      }]
    },
    "/api/v2/users/checkadmin": {
      "get": {
        "description": "Auto generated using Swagger Inspector",
        "responses": {
          "200": {
            "description": "Auto generated using Swagger Inspector",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "type": "string"
                },
                "examples": {}
              }
            }
          }
        },
        "servers": [{
          "url": "http://dvws.local"
        }]
      },
      "servers": [{
        "url": "http://dvws.local"
      }]
    },
    "/api/v2/notesearch": {
      "post": {
        "description": "Auto generated using Swagger Inspector",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/body_1"
              },
              "examples": {
                "0": {
                  "value": "{\"search\":\"search\"}"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Auto generated using Swagger Inspector",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "type": "string"
                },
                "examples": {}
              }
            }
          }
        },
        "servers": [{
          "url": "http://dvws.local"
        }]
      },
      "servers": [{
        "url": "http://dvws.local"
      }]
    },
    "/api/v2/export": {
      "post": {
        "description": "Auto generated using Swagger Inspector",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/body_1"
              },
              "examples": {
                "0": {
                  "value": "{\"data\":\"W3sicGFzc3BocmFzZSI6IjdkNzM3ZDgxNWU0Yzc5ODI1ZDZlNjA0YTZjNWQ3MjZlIiwicmVtaW5kZXIiOiJ0d2VyZXdyIn0seyJwYXNzcGhyYXNlIjoiN2Q3MzdkODE1ZTRjNzk4MjVkNmU2MDRhNmM1ZDcyNmUiLCJyZW1pbmRlciI6InR3ZXJld3IifSx7InBhc3NwaHJhc2UiOiI1NDU4N2U2ODM1NmM2YjQ3MzE3MDViNzE2OTY4NGE0OSIsInJlbWluZGVyIjoic2Rmc2RmIn0seyJwYXNzcGhyYXNlIjoiMzM0NjgwMmQ1MTZiNzEzNjY4NWM0OTU2MzM3YzJkNTgiLCJyZW1pbmRlciI6IndlZXdyIn1d\"}"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Auto generated using Swagger Inspector",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "type": "string"
                },
                "examples": {}
              }
            }
          }
        },
        "servers": [{
          "url": "http://dvws.local"
        }]
      },
      "servers": [{
        "url": "http://dvws.local"
      }]
    },
    "/api/v2/passphrase": {
      "post": {
        "description": "Auto generated using Swagger Inspector",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/body_1"
              },
              "examples": {
                "0": {
                  "value": "{\"passphrase\":\"7d737d815e4c79825d6e604a6c5d726e\",\"reminder\":\"twerewr\"}"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Passphrase Saved Successfully",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "type": "string"
                },
                "examples": {}
              }
            }
          }
        },
        "servers": [{
          "url": "http://dvws.local"
        }]
      },
      "servers": [{
        "url": "http://dvws.local"
      }]
    },
    "/api/v2/passphrase/{username}": {
      "get": {
        "description": "Auto generated using Swagger Inspector",
        "responses": {
          "403": {
            "description": "Auto generated using Swagger Inspector",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "type": "string"
                },
                "examples": {}
              }
            }
          }
        },
        "servers": [{
          "url": "http://dvws.local"
        }]
      },
      "servers": [{
        "url": "http://dvws.local"
      }]
    },
  },
  "components": {
    "schemas": {
      "body_1": {
        "type": "object",
        "properties": {
          "search": {
            "type": "string"
          }
        }
      },
      "body": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "body": {
            "type": "string"
          },
          "type": {
            "type": "string"
          }
        }
      }
    },
    "securitySchemes": {
      "oauth2": {
        "type": "oauth2",
        "flows": {
          "implicit": {
            "authorizationUrl": "http://yourauthurl.com",
            "scopes": {
              "scope_name": "Enter your scopes here"
            }
          }
        }
      }
    }
  }
}