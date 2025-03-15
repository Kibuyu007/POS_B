
import Users from "../../Models/Users/users.js";
import bcrypt from 'bcrypt'

//update user ...
export const updateUser = async (req, res) => {

    const id = req.params.id
      
        try {
  
          const userUp = await Users.findById(id);
          
  
          if (!userUp) { 
  
            return res.status(404).json("User not found.juttuioiuui");
  
          }
  
          if (req.userId !== userUp._id.toString()) {
  
            return res.status(401).json("You are not authorized to delete this user.");
  
          }
          
  
          if(req.body.password){
  
              // Check password requirements, e.g., length
            if (req.body.password.length < 4) {
             return res.status(400).json({ error: "Password must be at least 4 characters long." });
           }
  
            req.body.password = await bcrypt.hash(req.body.password, 10);
          }
          
          const updateUser = await Users.findByIdAndUpdate(
            id,
            { $set:{
              name: req.body.name,
              email: req.body.email,
              password: req.body.password,
              photo: req.body.photo,
            }
            },
            { new: true }
          );
  
          const {password, ...ficha} = updateUser._doc
      
          return res
            .status(200)
            .send(ficha);
      
        } catch (error) {
          res.status(500).json({ error: "error" });
        }
      }



  //Delete User....
  export const deleteUser = async (req, res) => {

    const { id } = req.params;

    try {

      const user = await Users.findById(id);
  
      if (!user) {
        return res.status(404).json("User not found.");
      }
  
      if (req.userId !== user._id.toString()) {
        return res.status(401).json("You are not authorized to delete this user.");
      }
  
      await Users.findByIdAndDelete(id);
      return res.status(200).json("User deleted.");


    } catch (error) {
      return res.status(500).json({ error: "An error occurred." });
    }
  }