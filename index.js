const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.25zkwku.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const packageCollection = client
      .db("BanglaQuest")
      .collection("allPackages");
    const storyCollection = client.db("BanglaQuest").collection("stories");
    const tourGuideCollection = client
      .db("BanglaQuest")
      .collection("tourGuides");
    const userCollection = client.db("BanglaQuest").collection("users");
    const bookingCollection = client.db("BanglaQuest").collection("bookings");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "12h",
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req,res,next) => {
      if(!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorize access" });
      }
      const token = req.headers.authorization.split(" ")[1]

      jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded) => {
        if(err) {
          return res.status(401).send({ message: "unauthorize access" });
        }
        req.decoded = decoded;
        next()
      })
    }

    app.get("/packages", async (req, res) => {
      try {
        const result = await packageCollection
          .aggregate([{ $sample: { size: 3 } }])
          .toArray();
        res.send(result);
      } catch (error) {
        console.log(error, "error fetching packages");
      }
    });
    app.get("/allPackages", async (req, res) => {
      const result = await packageCollection.find().toArray();

      res.send(result);
    });

    app.get("/allPackages/:id", async (req, res) => {
      const id = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await packageCollection.findOne(query);
      res.send(result);
    });

    app.get("/stories", async (req, res) => {
      try {
        const result = await storyCollection
          .aggregate([{ $sample: { size: 4 } }])
          .toArray();
        res.send(result);
      } catch (error) {
        console.log(error, "error fetching tour stories");
      }
    });
    app.get("/allStories", async (req, res) => {
      const result = await storyCollection.find().toArray();
      res.send(result);
    });

    app.get("/tourGuides", async (req, res) => {
      try {
        const result = await tourGuideCollection
          .aggregate([{ $sample: { size: 6 } }])
          .toArray();
        res.send(result);
      } catch (error) {
        console.log(error, "error fetching tourGuides");
      }
    });

    app.get("/tourGuides/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await tourGuideCollection.findOne(query);
      res.send(result);
    });

    // User's api
    app.post("/users", async (req, res) => {
      const userInfo = req.body;
      const existingUser = await userCollection.findOne({
        email: userInfo.email,
      });
      if (existingUser) {
        return res.send({ message: "user already exist" });
      }
      const result = await userCollection.insertOne(userInfo);
      res.send(result);
    });

    // Bookings
    app.post('/bookings',verifyToken,async (req,res) => {
      const bookingsInfo = req.body
      const result = await bookingCollection.insertOne(bookingsInfo)
      res.send(result)
    })
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("BanglaQuest server is running");
});

app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});
