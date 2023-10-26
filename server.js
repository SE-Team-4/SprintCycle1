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
    res.status(500).send('Internal Server Error 1');
  }
});

async function fetchAllCourses() {
  try {
    const allClasses = await classesCollection.find({}, { courseNumber: 1, creditHours: 1 }).toArray();
    return allClasses;
  } catch (error) {
    throw error;
  }
}

let currentCourses = []; 

app.get('/planner', async (req, res) => {
  try {
    let coursesNotTaken = [];

    // Populate coursesNotTaken based on the conditions in your GET route
    const student = await student1Collection.findOne({ studentId: selectedStudent });
    if (student) {
      const allClasses = await fetchAllCourses();
      coursesNotTaken = allClasses.filter(course => !student.coursesTaken.includes(course._id));
    }

    // Render the 'planner' template and pass the data
    res.render('planner', { coursesNotTaken, currentCourses });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/planner', async (req, res) => {
  try {
    let coursesNotTaken = [];

    const selectedCourseIds = req.body.selectedCourses;
    if (!selectedCourseIds || !Array.isArray(selectedCourseIds)) {
      res.status(400).send('Invalid course selections');
      return;
    }

    // Fetch all courses, including the creditHours field
    const allClasses = await fetchAllCourses();

    const selectedCourses = allClasses.filter(course => selectedCourseIds.includes(course._id));

    // Retrieve the current courses from the hidden input field
    currentCourses = JSON.parse(req.body.currentCourses);

    // Pass 'coursesNotTaken' and 'currentCourses' when rendering the template
    res.render('planner', {
      coursesNotTaken: coursesNotTaken,
      selectedCourses: selectedCourses,
      currentCourses: currentCourses.concat(selectedCourses),
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.listen(process.env.PORT || PORT, () => {
  console.log(`Server running on port ${PORT}`);
});