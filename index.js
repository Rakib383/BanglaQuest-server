const express = require("express");
const cors = require("cors");
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.25zkwku.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

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
    const packageCollection = client.db("BanglaQuest").collection("allPackages")
    const storyCollection = client.db("BanglaQuest").collection("stories")
    const tourGuideCollection = client.db("BanglaQuest").collection("tourGuides")


    app.get('/packages',async (req,res) => {
        const result = await packageCollection.find().limit(3).toArray()
        res.send(result)
    })
    app.get('/allPackages',async (req,res) => {
        const result = await packageCollection.find().toArray()

        res.send(result)
    })


    app.get('/allPackages/:id',async (req,res) => {
        const id = req.params
        const query = {_id:new ObjectId(id)}
        const result = await packageCollection.findOne(query)
        res.send(result)

    })

    app.get('/stories',async (req,res) => {
        const result = await storyCollection.find().limit(4).toArray()
        res.send(result)
    })
    app.get('/allStories',async (req,res) => {
        const result = await storyCollection.find().toArray()
        res.send(result)
    })

    app.get('/tourGuides',async (req,res) => {
        const result = await tourGuideCollection.find().toArray()
        res.send(result)
    })

    app.get('/tourGuides/:id',async (req,res) => {
        const {id} = req.params
        const query = {_id:new ObjectId(id)}
        const result = await tourGuideCollection.findOne(query)
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
