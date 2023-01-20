const express = require('express');
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000;
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const jwt = require("jsonwebtoken");


app.use(cors())
app.use(express.json())

async function jwtverify(req, res, next){
  const freezertoken = req.headers.freezertoken.split(' ')[1];
  if(!freezertoken){
    return res.status(401).send({message:'unauthorized access'})
  }
  jwt.verify(freezertoken, process.env.AUTH_ACCESS_TOKEN, function(err, decoded){
    if(err){
      return res.status(403).send({message:'Forbidden'})
    }
    req.decoded = decoded
    next()
  })
  
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v48zzim.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});


async function run(){
    try{

        const bannerCollection = client.db("freezerCollection").collection('freezerbanner')
        const productsCollection = client.db("freezerCollection").collection('freezerproducts')
        const usersCollection = client.db("freezerCollection").collection('freezerusers')
        const categoryCollection = client.db("freezerCollection").collection('freezercategory')

        //jwt
        app.get('/jwt', async(req, res)=>{
          const email = req.query.email;
          const token = jwt.sign({email}, process.env.AUTH_ACCESS_TOKEN,{expiresIn:'1h'});
          res.send({token})
        })
        
        //payment
        app.post("/create-payment-intent", async (req, res) => {
          const freezerpayment = req.body;
          console.log(freezerpayment)
          // const amount = freezerpayment.appointmentPrice * 100;
          // const paymentIntent = await stripe.paymentIntents.create({
          //   amount: amount,
          //   currency: "usd",
          //   payment_method_types: ["card"],
          // });

          // res.send({
          //   clientSecret: paymentIntent.client_secret,
          // });
        });


        app.get('/banner',async(req, res)=>{
            const query = {}
            const result = await bannerCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/products',async(req, res)=>{
            const query = {}
            const result = await productsCollection.find(query).toArray()
            res.send(result)
        })
        app.get("/frreezerproduct", async (req, res) => {
          const id = parseInt(req.query.id); 
          const query = {categoryid:id}
          const result = await productsCollection.find(query).toArray();
          res.send(result);
        });
        app.post("/frreezerproduct", async (req, res) => {
          const productforupload = req.body;
          const result = productsCollection.insertOne(productforupload)
          res.send(result)
        });
        app.get("/frreezerproduct/single", async (req, res) => {
          const id = req.query.id;
          const query = { _id:ObjectId(id)};
          const result = await productsCollection.find(query).toArray();
          res.send(result);
        });

        app.put('/user/add',async(req, res)=>{
          const query = {email:req.body.email};
          const option = {upsert:true}
          const finduser = {
            $set: {
              name: req.body.name,
              photourl: req.body.photourl,
              email: req.body.email,
              userrole: req.body.userrole,
              uservarified: req.body.uservarified,
            },
          };
          const result = await usersCollection.updateOne(query, finduser, option)
        })

        app.get("/loaddbuser",async(req, res)=>{
          const email = req.query.email;
          const query = {email:email}
          const result = await usersCollection.findOne(query)
          res.send(result)
        });

        app.get('/uservarifiedemail',async(req, res)=>{
          const email = req.query.email;
          const query = {email:email}
          const result = await usersCollection.findOne(query)
          res.send(result)
        })
        app.put('/uservarified',async(req, res)=>{
          const id = req.query.id;
          const query = {_id:ObjectId(id)}
          const option = {upsert:true}
          const updatedDoc = {
            $set: {
              uservarified:req.body.uservarified
            },
          };
          const update = await usersCollection.updateOne(query, updatedDoc, option)
          const result = await usersCollection.find({}).toArray()
          res.send(result)
          
        })

        app.get('/checkuserrole',async(req, res)=>{
          const email = req.query.email;
          const query = {email:email}
          const result = await usersCollection.findOne(query)
          res.send(result)
        })

        app.get("/loadmyproduct",async(req, res)=>{
          const email = req.query.email;
          const query = {selleremail:email}
          const result = await productsCollection.find(query).toArray()
          res.send(result)
        });
        app.delete("/loadmyproductdelete", async (req, res) => {
          const id = req.query.id;
          const query = { _id: ObjectId(id) };
          const result = await productsCollection.deleteOne(query)
          res.send(result);
        });

        app.put("/advertiseupdate",async(req, res)=>{
          const id = req.query.id;
          const advertiseremail = req.headers.advertiseremail;
          const query = {_id:ObjectId(id)}
          const option = {upsert:true}
          const updatedDoc = {
            $set:{
              advertiser:advertiseremail
            }
          }
          const update = await productsCollection.updateOne(query, updatedDoc, option)
          res.send(update)
        });
        app.get("/loadadvertiseproduct",async(req, res)=>{
          const email = req.query.email;
          const query = { advertiser:email };
          const result = await productsCollection.find(query).toArray();
          res.send(result)
        });

        app.get("/accountstatus/:id", async (req, res) => {
          const accountstatus = req.params.id;
          if(accountstatus === 'sellers'){
            const query = { userrole:'seller' };
            const result = await usersCollection.find(query).toArray()
            res.send(result)
          }else if(accountstatus === "buyers"){
            const query = { userrole: "buyer" };
            const result = await usersCollection.find(query).toArray();
            res.send(result)
          }
        });

        app.delete("/deleteuseraccess",async(req, res)=>{
          const id = req.query.id;
          const query = {_id:ObjectId(id)}
          const result = await usersCollection.deleteOne(query);
          res.send(result)
        });

        app.put("/soldedproductupdate",async(req, res)=>{
          const id = req.query.id;
          const query = {_id:ObjectId(id)}
          const option = {upsert:true}
          const updatedDoc = {
            $set: {
              status: req.body.status,
              buyeremail: req.body.buyeremail,
              buyerphonenumber: req.body.buyerphonenumber,
            },
          };
          const result = await productsCollection.updateOne(query, updatedDoc, option)
          res.send(result)
        });

        app.get("/loadsoldedproduct",async(req, res)=>{
          const email = req.query.email;
          const query = { buyeremail: email, status:'sold'};
          const result = await productsCollection.find(query).toArray()
          res.send(result)
          
        });

        app.get('/alluserformakeadmin',jwtverify, async(req, res)=>{
          const query = {}
          const result = await usersCollection.find(query).toArray()
          res.send(result)
        })
        app.put('/alluserformakeadmin',async(req, res)=>{
          const id = req.query.id;
          const query = {_id:ObjectId(id)}
          const option = {upsert:true}
          const updatedDoc = {
            $set:{
              userrole:req.body.userrole
            }
          }
          const result = await usersCollection.updateOne(query, updatedDoc, option)
          const updatedresult = await usersCollection.find({}).toArray()
          res.send(updatedresult)
        })

        app.post("/addcategory",async(req, res)=>{
          const category = req.body;
          const result = await categoryCollection.insertOne(category);
          console.log(category)
          res.send(result)
        });

        app.get("/getcategory",async(req, res)=>{
          const query = {}
          const result = await categoryCollection.find(query).toArray()
          res.send(result)
        });

    }finally{

    }
}
run().catch(err => err.message)

app.get('/',(req, res)=>{
    res.send('Your server is running........')
})
app.listen(port, ()=>{
    console.log('Server is running')
})


