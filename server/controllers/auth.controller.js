import bcrypt from 'bcrypt';
import dbpool from '../db/connectAWSdb.js'; 
import generateTokenAndSetCookie from '../utils/generateToken.js';

// signin controller
export const signin = async (req, res) => {
  try {
    const { username, password, brokerID } = req.body;
    dbpool.getConnection(async(err,connection)=>{
      if (err) throw err
      connection.query('SELECT * FROM Users WHERE Username = ? AND BrokerID = ?',[username,brokerID],async(err,rows)=>{
        if (err) throw err
        const user = rows[0]

        //console.log(rows)
        //connection.release()
        if (!user) {
        return res.status(400).json({ error: "Invalid username or password or brokerID" });
      }
  
      // Compare passwords
      const isPasswordCorrect = await bcrypt.compare(password, user['Password']);
      
      if (!isPasswordCorrect) {
        return res.status(400).json({ error: "Invalid username or password or brokerID" });
      }
  
      // Login successful, generate token and set cookie
      generateTokenAndSetCookie(user['UserID'], res); // Call the function with userId
  
      // Respond with user information
      res.status(200).send("login successfully");
      }
    );
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// signout controller not finish wait for kennn
export const signout = (req, res) => {
	try {
		res.cookie("jwt", "", { maxAge: 0 });
		res.status(200).json({ message: "Logged out successfully" });
	} catch (error) {
		console.log("Error in logout controller", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};


