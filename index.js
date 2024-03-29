require("dotenv").config();
var pavlok = require("pavlok-beta-api-login");
var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var cookieSession = require("cookie-session");
var nunjucks = require("nunjucks");
var uuid = require("node-uuid");
var pg = require("pg");
pg.defaults.ssl = true;

//Setup the app
var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(
  cookieSession({
    name: "session",
    httpOnly: false,
    keys: ["asessionkeythisis"],
  })
);
app.use(function (req, res, next) {
  console.log("-------------------------------");
  console.log(
    req.url + " requested from " + (req.connection.remoteAddress || req.ip)
  );
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("Body: " + JSON.stringify(req.body));
  }
  if (req.params && Object.keys(req.params).length > 0) {
    console.log("Params: " + JSON.stringify(req.params));
  }

  res.header("X-XSS-Protection", 0);

  //For everything but the normal file browse routes and context script, we
  //proceed to the next route
  if (
    req.url != "/" &&
    req.url != "/context.js" &&
    req.url != "/index.html" &&
    req.url != "/save_file" &&
    req.url != "/update_file" &&
    !req.url.startsWith("/file/") &&
    req.url != "/delete_file" &&
    req.url != "/share_file"
  ) {
    next();
    return;
  }

  //Perform user lookup for the / route and the /context.js route to let
  //these routes populate themselves as needed with user information, or redirect
  //to a proper page
  if (
    (req.session.sid === undefined || req.session.sid == null) &&
    req.query.sid == null
  ) {
    console.log("Couldn't find SID; this route needes authentication!");
    pavlok.auth(req, res);
  } else {
    setupQuery(
      "SELECT * FROM Session s INNER JOIN Users u ON u.uid=s.uid WHERE session_id=$1",
      [req.session.sid || req.query.sid],
      function (error, rows) {
        if (error || rows.length < 1) {
          console.log("Session fetch error from SID!");
          pavlok.auth(req, res);
        } else {
          console.log(
            "Fetched user: " + rows[0].name + " (" + rows[0].uid + ")"
          );
          req.pavuser = {
            //We populate the 'pavuser' object
            uid: rows[0].uid,
            name: rows[0].name,
            code: rows[0].token,
            email: rows[0].email,
          };
          next();
        }
      }
    );
  }
});
nunjucks.configure("views", {
  autoescape: false,
  express: app,
});

//Postgres connect
var client;
client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});
client.connect();

//Create a session and drop the required cookies
function establishSession(req, res, meResponse) {
  var sid = uuid.v4();
  setupQuery(
    "DELETE FROM Session WHERE uid=$1",
    [meResponse.uid],
    function (error, rows) {
      if (error) {
        res.status(500).send("Could not delete old sessions!");
      } else {
        setupQuery(
          "INSERT INTO Session (uid, session_id) VALUES ($1, $2)",
          [meResponse.uid, sid],
          function (error, rows) {
            if (error) {
              res.status(500);
              res.render("error.html", {
                message: "Error creating session!",
              });
            } else {
              req.session.sid = sid;
              console.log("SID is now: " + req.session.sid);
              req.pavuser = {
                uid: meResponse.uid,
                name: meResponse.name,
                email: meResponse.email,
                code: req.session.pavlok_token,
              };
              serveNewFile(req, res);
            }
          }
        );
      }
    }
  );
}

//Initialize the app
pavlok.init(
  "212394dadd49c39c42d1135095f4fdf6fdb1f20675910e8aa73eab8cdca316cf",
  "6b5afef28d37acb1f7f18974654e00688122d422cd56c7ac6d5603e7f823fffc",
  {
    verbose: true,
    app: app,
    message: "Hello from the developer playground!",
    callbackUrl:
      "https://pavlok-developer-playground.herokuapp.com/auth/result",
    callbackUrlPath: "/auth/result",
    successPath: "/success",
    errorPath: "/error",
    apiUrl: "https://pavlok-mvp.herokuapp.com",
    successWithCode: true,
    handleSessions: false,
  }
);

//Attributions page
app.get("/attributions.html", function (req, res) {
  return res.render("attributions.html");
});

//Helper function for executing PostgreSQL queries
function setupQuery(queryText, params, callback) {
  var query = client.query(queryText, params);
  query.on("row", function (row, result) {
    result.addRow(row);
  });
  query.on("error", function (error) {
    console.log("Error while executing query: " + queryText);
    console.log("Parameters were:");
    for (var i = 0; i < params.length; i++) {
      console.log(params[i]);
    }
    console.log("Error was: " + JSON.stringify(error));
    callback(error, null);
  });
  query.on("end", function (result) {
    callback(null, result.rows);
  });
}

//Serve the success page with some necessary pre-serve tweaks
app.get("/success", function (req, res) {
  //Get /me from Pavlok using access token
  var token = req.query.code;
  var queryParams = {
    access_token: token,
  };

  request(
    {
      url: "https://pavlok-mvp.herokuapp.com/api/v1/me",
      qs: queryParams,
      method: "GET",
    },
    function (error, response, body) {
      if (error) {
        console.log(JSON.stringify(error));
        return res.render("error.html", {
          message: "Error authenticating!",
        });
      } else {
        var meResponse;
        try {
          meResponse = JSON.parse(body);
        } catch (e) {
          return res.render("error.html", {
            message: "Error authenticating!",
          });
        }
        setupQuery(
          "SELECT FROM Users WHERE uid=$1",
          [meResponse.uid],
          function (error, rows) {
            if (!error && rows.length > 0) {
              //Update the user
              setupQuery(
                "UPDATE Users SET token=$1 WHERE uid=$2",
                [token, meResponse.uid],
                function (error, rows) {
                  if (error) {
                    res.status(500).send("Failed to update the user!");
                  } else {
                    establishSession(req, res, meResponse);
                  }
                }
              );
            } else {
              //Insert the user
              setupQuery(
                "INSERT INTO Users(uid, name, email, token) VALUES ($1, $2, $3, $4)",
                [meResponse.uid, meResponse.name, meResponse.email, token],
                function (error, rows) {
                  if (error) {
                    res.status(500).send("Failed to insert the user!");
                  } else {
                    establishSession(req, res, meResponse);
                  }
                }
              );
            }
          }
        );
      }
    }
  );
});

function fetchUserFiles(uid, callback) {
  setupQuery(
    "SELECT * FROM Files WHERE owner=$1",
    [uid],
    function (error, rows) {
      if (error) {
        callback([], []);
      } else {
        var ownedFiles = [];
        for (var i = 0; i < rows.length; i++) {
          var fname = rows[i].fname;
          var fid = rows[i].fid;

          ownedFiles.push({ name: fname, id: fid });
        }
        fetchSharedFiles(uid, ownedFiles, callback);
      }
    }
  );
}

function fetchSharedFiles(uid, ownedFiles, callback) {
  setupQuery(
    "SELECT * FROM Files f INNER JOIN Shared_With s ON f.fid=s.file_id INNER JOIN Users u ON f.owner=u.uid WHERE s.grantee=$1",
    [uid],
    function (error, rows) {
      if (error) {
        callback(ownedFiles, []);
      } else {
        var files = [];
        for (var i = 0; i < rows.length; i++) {
          var fname = rows[i].fname;
          var fid = rows[i].fid;
          var granter = rows[i].email;

          files.push({ name: fname, id: fid, granter: granter });
        }
        callback(ownedFiles, files);
      }
    }
  );
}

function serveNewFile(req, res) {
  fetchUserFiles(req.pavuser.uid, function (owned, shared) {
    return res.render("new_file.html", {
      name: req.pavuser.name,
      uid: req.pavuser.uid,
      code: req.pavuser.code,
      email: req.pavuser.email,
      ownedFiles: JSON.stringify(owned),
      sharedFiles: JSON.stringify(shared),
    });
  });
}

app.get("/", serveNewFile);

app.get("/file/:fname", function (req, res, next) {
  //Try and get file
  setupQuery(
    "SELECT * FROM Files WHERE fid=$1",
    [req.params.fname],
    function (error, rows) {
      if (error || rows.length == 0) {
        res.status(404);
        return res.render("error.html", {
          message: "File not found or inaccessible.",
        });
      } else {
        //Compare user ID with owner; if owner, render file
        if (rows[0].owner == req.pavuser.uid) {
          fetchUserFiles(req.pavuser.uid, function (owned, shared) {
            return res.render("saved_file.html", {
              name: req.pavuser.name,
              uid: req.pavuser.uid,
              code: req.pavuser.code,
              email: req.pavuser.email,
              ownedFiles: JSON.stringify(owned),
              sharedFiles: JSON.stringify(shared),
              fileName: rows[0].fname,
              content: escape(rows[0].code),
              fid: rows[0].fid,
              fileVisibility: rows[0].share_type,
            });
          });
        } else {
          if (rows[0].share_type == "public") {
            return res.render("shared_file.html", {
              name: req.pavuser.name,
              uid: req.pavuser.uid,
              code: req.pavuser.code,
              email: req.pavuser.email,
              ownedFiles: JSON.stringify([]),
              sharedFiles: JSON.stringify([]),
              fileName: rows[0].fname,
              content: escape(rows[0].code),
              fid: rows[0].fid,
            });
          } else {
            //Last-ditch attempt: check to see if there's a Shared_With relationship
            setupQuery(
              "SELECT * FROM Shared_With WHERE grantee=$1 AND file_id=$2",
              [req.pavuser.uid, rows[0].fid],
              function (error, rows) {
                if (error || rows.length == 0) {
                  res.status(404);
                  return res.render("error.html", {
                    message: "File not found or inaccessible.",
                  });
                } else {
                  return res.render("shared_file.html", {
                    name: req.pavuser.name,
                    uid: req.pavuser.uid,
                    code: req.pavuser.code,
                    email: req.pavuser.email,
                    fileName: rows[0].fname,
                    ownedFiles: JSON.stringify([]),
                    sharedFiles: JSON.stringify([]),
                    content: escape(rows[0].code),
                    fid: rows[0].fid,
                  });
                }
              }
            );
          }
        }
      }
    }
  );
});

//Upload a file
app.post("/save_file", function (req, res) {
  var code = req.body.code;
  var uid = req.body.uid;
  var fname = req.body.fname;
  var shareType = "private";

  if (code == null || uid == null || fname == null) {
    res.status(400).send("No data given!");
    return;
  }
  if (uid != req.pavuser.uid) {
    res.stats(400).send("You can't update another user's files!");
    return;
  }

  setupQuery(
    "INSERT INTO Files (owner, fname, code, share_type) VALUES ($1, $2, $3, $4) RETURNING fid",
    [uid, fname, code, shareType],
    function (error, rows) {
      if (rows.length > 0) {
        res.status(200).json({ status: "ok", error: null, fid: rows[0].fid });
      } else {
        res.status(500).json({ status: "error", error: error });
      }
    }
  );
});

//Create a share grant
//Create a function that's a pyramid
app.post("/share_file", function (req, res) {
  if (req.body.fid == null || req.body.email == null) {
    res.status(400).send();
    return;
  }

  var fileId = req.body.fid;
  var userEmail = req.body.email;

  setupQuery(
    "SELECT * FROM Files WHERE fid=$1 AND owner=$2",
    [fileId, req.pavuser.uid],
    function (err, rows) {
      if (err || rows.length == 0) {
        res.json({
          status: "error",
          message: "You don't have access to this file!",
        });
      } else {
        setupQuery(
          "SELECT * FROM Users WHERE email=$1",
          [userEmail],
          function (err, rows) {
            if (err || rows.length == 0) {
              res.json({
                status: "error",
                message:
                  userEmail +
                  " hasn't signed in with the Pavlok Developer Playground yet, so you can't share files with them.",
              });
            } else {
              var grantee = rows[0].uid;
              setupQuery(
                "SELECT * FROM Shared_With WHERE grantee=$1 AND file_id=$2",
                [grantee, fileId],
                function (err, rows) {
                  if (err || rows.length > 0) {
                    res.json({
                      status: "warning",
                      message:
                        "You've already shared this file with " +
                        userEmail +
                        ".",
                    });
                  } else {
                    setupQuery(
                      "INSERT INTO Shared_With (grantee, file_id, owner) VALUES ($1, $2, $3)",
                      [grantee, fileId, req.pavuser.uid],
                      function (err, rows) {
                        if (err) {
                          res.json({
                            status: "error",
                            message: JSON.stringify(err),
                          });
                        } else {
                          res.json({
                            status: "ok",
                            message: "File shared with " + userEmail + ".",
                          });
                        }
                      }
                    );
                  }
                }
              );
            }
          }
        );
      }
    }
  );
});

//Update a file's code or share type
app.post("/update_file", function (req, res) {
  var sql = "UPDATE Files SET ";
  var sqlParams = [];

  if (req.body.fid == null) {
    res.status(400).send();
    return;
  }

  if (
    req.body.share_type != null &&
    (req.body.share_type == "private" || req.body.share_type == "public")
  ) {
    sql += "share_type=$" + (sqlParams.length + 1);
    sqlParams.push(req.body.share_type);
  }

  if (req.body.code != null) {
    sql += "code=$" + (sqlParams.length + 1);
    sqlParams.push(req.body.code);
  }

  if (req.body.file_name != null) {
    sql += "fname=$" + (sqlParams.length + 1);
    sqlParams.push(req.body.file_name);
  }

  sql +=
    " WHERE owner=$" +
    (sqlParams.length + 1) +
    " AND fid=$" +
    (sqlParams.length + 2);
  sqlParams.push(req.pavuser.uid);
  sqlParams.push(req.body.fid);

  setupQuery(sql, sqlParams, function (error, rows) {
    if (error) {
      res.status(400).send();
    } else {
      res.status(200).send();
    }
  });
});

//Delete a file
app.post("/delete_file", function (req, res) {
  if (req.body.fid == null) {
    res.status(400).send();
    return;
  }

  setupQuery(
    "SELECT FROM Files WHERE fid=$1 AND owner=$2",
    [req.body.fid, req.pavuser.uid],
    function (error, rows) {
      if (error) {
        res.status(400).send();
      } else {
        setupQuery(
          "DELETE FROM Files WHERE fid=$1",
          [req.body.fid],
          function (error, rows) {
            if (error) {
              res.status(400).send();
            } else {
              res.status(200).send();
            }
          }
        );
      }
    }
  );
});

//Logout of the server
app.get("/logout", function (req, res) {
  if (pavlok.isLoggedIn(req)) {
    pavlok.logout(req);
    req.session.sid = null;
    return res.render("error.html", {
      message:
        'Logged out. (You probably want to sign out <a href="https://pavlok-mvp.herokuapp.com/users/sign_out">here</a> too).',
    });
  } else {
    return res.status(404).send("You weren't signed in.");
  }
});

app.use(express.static(__dirname + "/public"));

//Start the server
app.listen(process.env.PORT || 3000, function () {
  console.log(
    "Visit the IP address of this machine, or http://localhost:3000/."
  );
});
