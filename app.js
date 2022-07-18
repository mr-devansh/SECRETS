//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const passportLocalMongoose = require("passport-local-mongoose");
const saltRounds = 10;
const validator = require("email-validator");
validator.validate("test@email.com"); // true


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));


app.use(session({
  secret: " Our little Secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-devansh:Devansh69@cluster0.a7bqg2l.mongodb.net/userDB");

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId:String,
  facebookId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

///////google
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ email: profile.emails[0].value, googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


///////FACEBOOK
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
    profileFields: ['id', 'email', 'name']
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(JSON.stringify(profile));
    User.findOrCreate({ email: profile.emails[0].value, facebookId: profile.id }, function (err, user) {
      console.log(user);
      return cb(err, user);
    });
  }
));
//email: profile.email[0].value,

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google", passport.authenticate('google',
{ scope: ["profile","email"]}
));

app.get("/auth/google/secrets",
  passport.authenticate("google", {failureRedirect: "/login"}),
  function(req, res){
    res.redirect("/secrets");
});

app.get("/auth/facebook",
  passport.authenticate("facebook",
  { scope:["email"]}
));

app.get("/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  });


app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  User.find({"secret":{$ne:null}}, function(err, foundUsers){
    if(err){
      console.log(err);
    }
    else{
      if(foundUsers){
        res.render("secrets", {userswithSecrets: foundUsers});
      }
    }
  });
});

app.get("/sorry", function(req, res){
  res.render("sorry");
})

app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else{
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
})

app.post("/register", function(req, res){
  if(validator.validate(req.body.username)){
    User.register({username: req.body.username}, req.body.password, function(err, user){
      if (err){
        console.log(err);
        res.redirect("/register");
      }
      else{
        passport.authenticate("local")(req, res, function(){
          res.redirect("/secrets");
        });
      }
    });

  }
  else{
    res.status(400).send('Invalid Email');
  }
});

app.post("/login", passport.authenticate("local"), function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err){
    if(err){
      console.log(err);
      res.redirect("/login");
    }
    else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  })
});


app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;
  User.findById(req.user.id, function(err, foundUser){
    if(err){
      console.log(err);
    }
    else{
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  })
});




app.listen(process.env.PORT||3000, function() {
  console.log("Server started on port 3000.");
});
