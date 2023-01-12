// imports 
const { urlencoded } = require('express')
const express = require('express')
const path = require('path')
const fileUrlToPath = require('url')
const bodyParser = require('body-parser');
const alert = require('alert');
const fs = require('fs')
const ejs = require('ejs')
ejs.open = '{{';
ejs.close = '}}';

// firebase imports 
const { initializeApp } = require('firebase/app')
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } = require('firebase/auth')
const { getDatabase, ref, set, update, onValue } = require('firebase/database')

// setting up the express application
const appExpress = express()
const port = 3000

// setting view engine to ejs
appExpress.set('view engine', 'ejs');

// set up environment variables 
require('dotenv').config()

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID
};

// Initialize Firebase
const firebase = initializeApp(firebaseConfig);
// Initialize variables
const auth = getAuth(firebase)
const database = getDatabase(firebase)

appExpress.listen(port, () => {
    console.log(`Application started on port: ${port}`)
  })  
  
appExpress.get('/', (req, res) => {
  res.render('pages/login')
})

appExpress.get('/register_bleed', (req, res) => {
  if (auth.currentUser) {
    res.render('pages/register_bleed')
  } else {
    res.render('pages/login.ejs')
  }
})

appExpress.get('/all_bleeds', (req, res) => {
  try {
    if (auth.currentUser) {
      var user = auth.currentUser;
      // Attach an asynchronous callback to read the data at our posts reference
      const bleedRef = ref(database, `users/${user.uid}/bleeds/`);
      onValue(bleedRef, (snapshot) => {
        // get a snapshot of all the data and add it to the data.json file
        const data = snapshot.val();
        const jsonString = JSON.stringify(data) + "\n";
        // need to make the data displayed be a lot prettier, might have to change some things with the db to make it possible
        // render the page and send the data to the page to be rendered
        res.render('pages/all_bleeds.ejs', { data: jsonString })
        // write the data to the data.json file to be saved 
        fs.writeFile("data.json", jsonString, (err) => err && console.error(err));
      })
    } else {
      res.render('pages/login.ejs')
    }
  } catch (error) {
    res.render('pages/login.ejs')
  }
})

appExpress.get('/register', (req, res) => {
    signOutUser;
    res.render('pages/register')
})

appExpress.get('/login', (req, res) => {
    signOut(auth).then(() => {
      res.render('pages/login');
    }).catch((error) => {
    // An error happened.
    alert("An error occured.")
    });
})

// sending the registration form data to the server and register the user
appExpress.use(bodyParser.urlencoded({ extended: false }));
appExpress.use(express.json());
appExpress.post('/register', function (req, res) {
  console.log("Register Data: " + req.body.name, req.body.email, req.body.password)
  createUserWithEmailAndPassword(auth, req.body.email, req.body.password)
  .then(function() {
    // making the current user trying to login the user
    var user = auth.currentUser

    // Create user data from the form data
    var user_data = {
      email: req.body.email,
      name: req.body.name,
      password: req.body.password,
      last_login: Date.now()
    }
    // adds the user data (username and password) to the database under their user uid 
    set(ref(database, 'users/' + user.uid), {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password
    })
    console.log('User Created')
    // load main page after a user has registered
    console.log(req.body.name)
    res.render('pages/main.ejs', { name: req.body.name, email: req.body.email, password: req.body.password });
  })
  .catch(function(error) {
    // firebase alerts us of any errors
    var error_code = error.code 
    var error_message = error.message 
    console.log(error_message)
    // show the user that the email they are registering with is already being used
    if (error) {
      alert("Email already in use.")
    }
  })
});

// sending the login form data to the server
appExpress.use(bodyParser.urlencoded({ extended: false }));
appExpress.use(express.json());
appExpress.post('/login', function (req, res) {
  console.log("Login Data: " + req.body.email, req.body.password)
  // create variables to use for sign in
  email = req.body.email 
  password = req.body.password 
  // attempts to sign in with email and password, creates a promise function
  signInWithEmailAndPassword(auth, email, password)
  .then(function() {
    // making the current user trying to login the user
    var user = auth.currentUser

    // Create user last login data from the login form submission time
    var user_data = {
      last_login: Date.now()
    }
    // checks if the username and password is correct
    update(ref(database, 'users/' + user.uid), {
      email: req.body.email,
      password: req.body.password
    })
    console.log('User logged in.')
    let nameOfUser = ref(database, `users/${user.uid}/name`);
    onValue(nameOfUser, (snapshot) => {
      // get a snapshot of the users name and send it to the ejs file
      const data = snapshot.val();
      const jsonString = JSON.stringify(data);
      console.log(jsonString)
      res.render('pages/main.ejs', { name: jsonString, email: req.body.email, password: req.body.password });
    })
  })
  .catch(function(error) {
    var error_code = error.code 
    var error_message = error.message 
    console.log(error_message)
    // tells user that the username or password is incorrect
    if (error) {
      alert("Username or password is incorrect.")
    }
  })
});


// adding the new bleed to the database under the user's UID
appExpress.use(bodyParser.urlencoded({ extended: false }));
appExpress.use(express.json());
appExpress.post('/register_bleed', function (req, res) {
  console.log("Bleed Data: " + req.body.bleedLocation, req.body.factorGiven, req.body.dateOfBleed, req.body.timeOfBleed)
  try {
    //grab the current logged in user
    var user = auth.currentUser

    // Create bleed data from the form data
    var user_data = {
      bleedLocation: req.body.bleedLocation,
      amountGiven: req.body.factorGiven,
      dateOfBleed: req.body.dateOfBleed,
      timeOfBleed: req.body.timeOfBleed
    }
    // adds the bleed data under the users uid + bleeds
    set(ref(database, `users/${user.uid}/bleeds/${req.body.dateOfBleed}`), {
      bleedLocation: req.body.bleedLocation,
      amountGiven: req.body.factorGiven,
      dateOfBleed: req.body.dateOfBleed,
      timeOfBleed: req.body.timeOfBleed
    })
    console.log('Bleed Added')
    // renders the page of all the bleeds 
    res.render('pages/all_bleeds.ejs')
      // Attach an asynchronous callback to read the data at our posts reference
    const bleedRef = ref(database, `users/${user.uid}/bleeds/`);
    onValue(bleedRef, (snapshot) => {
      // get a snapshot of all the data
      const data = snapshot.val();
      const jsonString = JSON.stringify(data);
      fs.writeFile('data.json', data, (err) => {
        if (err) {
          console.log(err)
        } else {
          console.log("File written successfully.")
          console.log(data);
        }
      })
  })
  } catch (error) {
    res.render('pages/login.ejs');
  }
});

// function to sign out a user if the sign out button is pressed
const signOutUser = () => {
  signOut(auth)
  res.render('pages/login.ejs')
}