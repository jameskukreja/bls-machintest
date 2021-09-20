const functions = require("firebase-functions");

// The Firebase Admin SDK to access Firestore.
const admin = require('firebase-admin');
const _ = require('lodash');
admin.initializeApp();

//Function to add score
//name, score and user_id are required fields
exports.addScore = functions.https.onRequest(async (req, res) => {
  let scoreCollection = admin.firestore().collection('scores');
  let query = scoreCollection.where('user_id', '==', Number(req.query.user_id));
  if(!req.query.user_id || !req.query.name || !req.query.score){
    res.status(400).send('user_id, name and score are required fields.')
  }
  let data = {
  	user_id: Number(req.query.user_id),
  	name: req.query.name,
  	score: Number(req.query.score),
  	timestamp : admin.firestore.Timestamp.now()
  }

  let foundUser = 0;
  
  await query.get().then(querySnapshot => {
  	querySnapshot.forEach(documentSnapshot => {
		scoreCollection.doc(documentSnapshot.id).update({
			name: data.name,
	  	score: data.score+Number(documentSnapshot.get("score")),
	  	timestamp : admin.firestore.Timestamp.now()
		});
		foundUser = 1;
	});
  });
  
  if(foundUser){
	return res.json({result: `Score has been updated`});
  }
  const writeResult = await admin.firestore().collection('scores').add(data);
  res.json({result: `Score has been added`});
});

//function to get scoreboard
//if type in query params doen't match the given options then default daily scoreboard will be returned
exports.getScoreBoard = functions.https.onRequest(async (req, res) => {

  let scoreBoardType = "daily";
  let scoreBoardTypes = ["daily", "monthly", "all_time"];
  if(req.query.type && scoreBoardTypes.includes(req.query.type.toLowerCase())){
    scoreBoardType = req.query.type.toLowerCase();
  }
  let scores = [];
  let scoreCollection = admin.firestore().collection('scores');
  let query = scoreCollection;
  let today =  new Date();
  today.setHours(0,0,0,0);

  switch(scoreBoardType) {
    case "monthly":
      var firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      var lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      query = query.orderBy("timestamp").where('timestamp', '>=', firstDay).where('timestamp', '<=', lastDay);
      break;
    case "all_time":
      query.orderBy("score", "desc").limit(100);
      break;
    default:
      query = query.orderBy("timestamp").where('timestamp', '>=', today);
  }

  await query.get().then(querySnapshot => {
    querySnapshot.forEach(documentSnapshot => {
      scores.push(documentSnapshot.data()); 
    });
  });

  scores = _.orderBy(scores, ['score'], ['desc']);
  scores = _.take(scores, 100)
  
  res.json({scoreBoardType:scoreBoardType, scores:scores});
});