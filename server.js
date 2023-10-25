const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb');
const PORT = 3000;
require('dotenv').config();

let dbConnectionStr = process.env.DB_STRING;
let classesCollection; 
let student1Collection;

app.set('view engine', 'ejs');

MongoClient.connect(dbConnectionStr, { useUnifiedTopology: true })
  .then(client => {
    console.log(`Connected to Database`);
    const db = client.db('CourseTimeline');
    classesCollection = db.collection('classes');
    student1Collection = db.collection('student1');
  })
  .catch(error => {
    console.error('Error connecting to the database:', error);
  });

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

//in place of a login for now
let selectedStudent = '12345';

app.get('/planAhead', async (req, res) => {
  try {
    if (!selectedStudent) {
      res.status(400).send('No student selected');
      return;
    }

    // Retrieve the selected student using the global variable
    const student = await student1Collection.aggregate([
      {
        $match: { studentId: selectedStudent } 
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'coursesTaken',
          foreignField: '_id',
          as: 'coursesTaken'
        }
      }
    ]).toArray();

    if (student.length === 0) {
      // Handle the case where the student is not found
      res.status(404).send('Student not found');
      return;
    }

    // Retrieve all classes
    const allClasses = await classesCollection.find().toArray();

    // Calculate courses not taken for the specific student
    const studentCoursesTakenIds = student[0].coursesTaken.map(course => course._id);
    const coursesNotTaken = allClasses.filter(course => !studentCoursesTakenIds.includes(course._id));

    // Create the object to render in the EJS template
    const studentWithCoursesNotTaken = {
      name: student[0].name,
      creditsCompleted: student[0].creditsCompleted,
      coursesTaken: student[0].coursesTaken,
      coursesNotTaken: coursesNotTaken
    };

    // Render the EJS template with the data for the specific student
    res.render('planAhead', { student: studentWithCoursesNotTaken });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(process.env.PORT || PORT, () => {
  console.log(`Server running on port ${PORT}`);
});