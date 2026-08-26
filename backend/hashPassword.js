import bcrypt from 'bcrypt';

const password = '1234';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
  } else {
    console.log('Hashed password for "1234":');
    console.log(hash);
  }
});
