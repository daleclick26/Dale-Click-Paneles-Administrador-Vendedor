const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '011205',
  database: 'daleClick'
});

connection.connect((err) => {
  if (err) {
    console.error('Error conexión DB:', err);
  } else {
    console.log('DB conectada');
  }
});

module.exports = connection;