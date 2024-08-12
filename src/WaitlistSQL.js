const sqlite3 = require('sqlite3').verbose();

// Initialize the database
const db = new sqlite3.Database('./waitlist.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Database connected.');
        db.run(`CREATE TABLE IF NOT EXISTS waitlist
                (
                    pos
                    INTEGER
                    PRIMARY
                    KEY
                    AUTOINCREMENT,
                    id
                    TEXT
                    NOT
                    NULL
                    UNIQUE
                )`, (err) => {
            if (err) {
                console.error('Error creating table', err.message);
            } else {
                console.log('Table created/already exists.');
            }
        });
    }
});

// Add a user to the waitlist
function addUser(userId) {
    return new Promise((resolve, reject) => {
        // First, check if the user already exists in the waitlist
        const selectQuery = `SELECT pos
                             FROM waitlist
                             WHERE id = ?`;
        db.get(selectQuery, [userId], (err, row) => {
            if (err) {
                reject(`Error checking if you are on the waitlist: ${err.message}`);
            } else if (row) {
                // If the user already exists, return their position
                resolve(`You are already on the waitlist, you are #${row.pos}.`);
            } else {
                // If the user does not exist, add them to the waitlist
                const insertQuery = `INSERT INTO waitlist (id)
                                     VALUES (?)`;
                db.run(insertQuery, [userId], function (err) {
                    if (err) {
                        reject(`Error joining the waitlist: ${err.message}.`);
                    } else {
                        // After adding, fetch the position to confirm
                        db.get(selectQuery, [userId], (err, newRow) => {
                            if (err) {
                                reject(`Error retrieving position: ${err.message}.`);
                            } else {
                                resolve(`You have joined the waitlist, you are #${newRow.pos}.`);
                            }
                        });
                    }
                });
            }
        });
    });
}

// Remove a user from the waitlist
function removeUser(userId) {
    return new Promise((resolve, reject) => {
        const query = `DELETE
                       FROM waitlist
                       WHERE id = ?`;
        db.run(query, [userId], function (err) {
            if (err) {
                reject(err.message);
            } else {
                resolve(`User removed from waitlist: <@${userId}>`);
            }
        });
    });
}

// Get a single user from the waitlist
function getUser(userId) {
    return new Promise((resolve, reject) => {
        const query = `SELECT *
                       FROM waitlist
                       WHERE id = ?`;
        db.get(query, [userId], (err, row) => {
            if (err) {
                reject(err.message);
            } else {
                resolve(row); // row will be undefined if no user is found
            }
        });
    });
}

// Get all users from the waitlist
function getAllUsers() {
    return new Promise((resolve, reject) => {
        const query = `SELECT *
                       FROM waitlist`;
        db.all(query, [], (err, rows) => {
            if (err) {
                reject(err.message);
            } else {
                resolve(rows);
            }
        });
    });
}

module.exports = {addUser, removeUser, getUser, getAllUsers};