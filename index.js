const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// middleware
app.use(cors());
app.use(express.json());

// mongodb connection string
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
    // await client.connect();
    const packageCollection = client
      .db("BanglaQuest")
      .collection("allPackages");
    const storyCollection = client.db("BanglaQuest").collection("stories");
    const userCollection = client.db("BanglaQuest").collection("users");
    const bookingCollection = client.db("BanglaQuest").collection("bookings");
    const tourGuideApplications = client
      .db("BanglaQuest")
      .collection("tourGuideApplications");
    const paymentCollection = client.db("BanglaQuest").collection("payments");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "12h",
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorize access" });
      }
      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorize access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;

      const user = await userCollection.findOne({ email });
      const isAdmin = user?.Role === "Admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

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
    app.get("/allPackages", verifyToken, async (req, res) => {
      const result = await packageCollection.find().toArray();

      res.send(result);
    });

    app.get("/allPackages/:id", async (req, res) => {
      const id = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await packageCollection.findOne(query);
      res.send(result);
    });

    app.post("/allPackages", verifyToken, verifyAdmin, async (req, res) => {
      const package = req.body;
      const result = await packageCollection.insertOne(package);
      res.send(result);
    });

    // stories api

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
    app.get("/allStories", verifyToken, async (req, res) => {
      const result = await storyCollection.find().toArray();
      res.send(result);
    });

    app.get("/allStories/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const result = await storyCollection.find({ email }).toArray();
      res.send(result);
    });

    app.get("/allStories/edit/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await storyCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.post("/allStories", verifyToken, async (req, res) => {
      const story = req.body;
      const result = await storyCollection.insertOne(story);
      res.send(result);
    });

    app.patch("/allStories/:id", verifyToken, async (req, res) => {
      const updatedStory = req.body;
      const { id } = req.params;
      const result = await storyCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: updatedStory,
        }
      );
      res.send(result);
    });

    app.patch("/allStories/:id/photos", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { newPhoto, removePhoto } = req.body;
      if (newPhoto) {
        const result = await storyCollection.updateOne(
          { _id: new ObjectId(id) },
          { $push: { images: newPhoto } }
        );
        return res.send(result);
      }
      const result = await storyCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $pull: { images: removePhoto },
        }
      );
      res.send(result);
    });

    app.delete("/allStories/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await storyCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    //  TourGuides api

    app.get("/tourGuides", async (req, res) => {
      const result = await userCollection
        .aggregate([
          {
            $match: { Role: "Tour Guide" },
          },
          {
            $sample: { size: 6 },
          },
        ])
        .toArray();
      res.send(result);
    });

    app.get("/allTourGuides", verifyToken, async (req, res) => {
      const result = await userCollection
        .find({ Role: "Tour Guide" })
        .toArray();
      res.send(result);
    });

    app.get("/tourGuides/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // User's api
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const { email } = req.query;

      try {
        const query = email ? { email: { $regex: email, $options: "i" } } : {};
        const result = await userCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/usersCount", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.estimatedDocumentCount();
      res.send({ count: result });
    });

    app.get("/allUsers", verifyToken, verifyAdmin, async (req, res) => {
      const page = parseInt(req.query.page);
      const result = await userCollection
        .find()
        .skip(page * 10)
        .limit(10)
        .toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const { email } = req.params;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;

      if (user) {
        admin = user?.Role === "Admin";
      }
      res.send({ admin });
    });

    app.get("/users/role/:email", async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const result = await userCollection.findOne(query);
       if(result) {
        return res.send({ Role: result.Role });
       }
       
       res.send({Role:"user not find in database"})
      
    });
    app.get("/users/:email",verifyToken, async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

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

    app.patch("/users/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const updatedInfo = req.body;
      const result = await userCollection.updateOne(query, {
        $set: updatedInfo,
      });
      res.send(result);
    });

    app.patch("/allUsers/:email", async (req, res) => {
      const { email } = req.params;
      const query = { email };
      const updatedInfo = req.body;
      const result = await userCollection.updateOne(query, {
        $set: updatedInfo,
      });
      res.send(result);
    });

    //tourGuideApplications
    app.get(
      "/guideApplications",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const page = parseInt(req.query.page);
        const result = await tourGuideApplications
          .find()
          .skip(page * 10)
          .limit(10)
          .toArray();
        res.send(result);
      }
    );
    app.get("/countCandidate", verifyToken, verifyAdmin, async (req, res) => {
      const result = await tourGuideApplications.estimatedDocumentCount();
      res.send({ count: result });
    });

    app.post("/guideApplications", verifyToken, async (req, res) => {
      const applications = req.body;
      const result = await tourGuideApplications.insertOne(applications);
      res.send(result);
    });

    app.delete(
      "/guideApplications/:email",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { email } = req.params;
        const result = await tourGuideApplications.deleteOne({ email });
        res.send(result);
      }
    );

    // Bookings

    app.get("/bookings/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const result = await bookingCollection.find({ email }).toArray();
      res.send(result);
    });
    app.get("/allBookings/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await bookingCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get("/assignTours/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const result = await bookingCollection
        .find({ tourGuideEmail: email })
        .toArray();
      res.send(result);
    });

    app.get("/countAssignTours/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const result = await bookingCollection.countDocuments({
        tourGuideEmail: email,
      });

      res.send({ count: result });
    });

    app.get("/countBookings/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const result = await bookingCollection.countDocuments({ email: email });

      res.send({ count: result });
    });

    app.post("/bookings", verifyToken, async (req, res) => {
      const bookingsInfo = req.body;
      const result = await bookingCollection.insertOne(bookingsInfo);
      res.send(result);
    });

    app.patch("/bookings/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const result = await bookingCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: data,
        }
      );
      res.send(result);
    });

    app.delete("/bookings/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await bookingCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // payment intent for stripe

    app.post("/create-payment-intent", verifyToken, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", verifyToken, async (req, res) => {
      const data = req.body;
      const result = await paymentCollection.insertOne(data);
      res.send(result);
    });

    // admin stats
    app.get("/adminStats", verifyToken, verifyAdmin, async (req, res) => {
      const totalTourGuides = await userCollection.countDocuments({
        Role: "Tour Guide",
      });
      const totalClient = await userCollection.countDocuments({
        Role: "Tourist",
      });
      const totalPackages = await packageCollection.estimatedDocumentCount();
      const totalStories = await storyCollection.estimatedDocumentCount();
      const result = await paymentCollection
        .aggregate([
          {
            $group: {
              _id: null,
              totalPayment: { $sum: "$amount" },
            },
          },
        ])
        .toArray();

      const payment = result.length > 0 ? result[0].totalPayment : 0;
      res.send({
        totalClient,
        totalTourGuides,
        totalPackages,
        totalStories,
        payment,
      });
    });

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
