require("dotenv").config();
require("./config/database").connect();

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = express();
const auth = require("./middleware/auth");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

app.use(express.json());

const User = require("./model/user");
const apiKey = "YOUR_API_KEY";

// Register
app.post("/register", async (req, res) => {
    try {
        const { first_name, last_name, email, password } = req.body;
        if (!(email && password && first_name && last_name)) {
            res.status(400).send("All input is required");
        }
        const oldUser = await User.findOne({ email });

        if (oldUser) {
            return res.status(409).send("User Already Exist. Please Login");
        }
        encryptedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            first_name,
            last_name,
            email: email,
            password: encryptedPassword,
        });
        const token = jwt.sign(
            { user_id: user._id, email },
            process.env.TOKEN_KEY,
            {
                expiresIn: "2h",
            }
        );
        user.token = token;
        res.status(201).json(user);
    } catch (err) {
        console.log(err);
    }
});

// Login
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!(email && password)) {
            res.status(400).send("All input is required");
        }
        const user = await User.findOne({ email });
        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign(
                { user_id: user._id, email },
                process.env.TOKEN_KEY,
                {
                    expiresIn: "2h",
                }
            );
            user.token = token;
            res.status(200).json(user);
        }
        else
            res.status(400).send("Invalid Credentials");
    } catch (err) {
        console.log(err);
    }
});

app.get("/verifyToken", async function (req, res, next) {
    const token = req.body.token || req.query.token || req.headers["x-access-token"];
    try {
        const user = jwt.verify(token, process.env.TOKEN_KEY);
        const email = user.email;
        const oldUser = await User.findOne({ email });
        res.send({"response" : "Token still valid.", "user" : oldUser, "token-decoded" : user});
    }
    catch (err) {
        res.status(404).send("Token invalid/User logged out.");
    }
})

app.get("/getWeather", auth, function (req, res, next) {
    let city = req.body.city;
    let url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${city}?key=${apiKey}`;
    fetch(url)
        .then(result => result.json())
        .then(json => res.send({ "response": ("latitude = " + json.latitude + " and longitude = " + json.longitude) }))
})

module.exports = app;