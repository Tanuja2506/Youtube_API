import mongoose from "mongoose";
import express  from "express";
import cloudinary from "../config/cloudinary.js";
import User from "../models/user.models.js"
import Video from "../models/video.model.js"
import { checkAuth } from "../middleware/auth.middleware.js";
const router=express.Router();
//Upload Video
router.post("/upload",checkAuth,async(req,res)=>{
    try{
 const{title,description,category,tags}=req.body;
 const videoId=req.params.id

 let video=await Video.findById(videoId);
 if(!video){
    return res.status(404).json({error:"video is not found"})
 }
 if(video.user_id.toString()!==req.user.id.toString()){
    return res.status(403).json({error:"UnAuthorized"})
 }

 if(req.files && req.files.thumbnail){
    await cloudinary.uploader.destroy(video.thumbnailId)
    const thumbnailUpload=await cloudinary.uploader(req.files.thumbnail.tempFilePath,{
        folder:"thumbnail"
    })
    video.thumbnailUrl=thumbnailUpload.secure_url;
    video.thumbnailId=thumbnailUpload.public_id

 }
 //Update fields

 video.title = title || video.title;
    video.description = description || video.description;
    video.category = category || video.category;
    video.tags = tags ? tags.split(",") : video.tags;

    await video.save();
    res.status(200).json({ message: "Video updated successfully", video });


    }catch(error){
        console.log(error);
        res.status(500).json({error:"Something went wrong", message:error.message});
    }
})



// 👉🏻 Delete Video
router.delete("/delete/:id" , checkAuth , async (req , res)=>{
    try {
      const videoId = req.params.id;
  
      let video = await Video.findById(videoId);
  
      if(!video) return res.status(404).json({error:"Video not found!"})
  
    
  
      if(video.user_id.toString() !== req.user._id.toString())
        {
          return res.status(403).json({error:"Unauthorized"})
        }  
  
        // Delete from cloudinary
        await cloudinary.uploader.destroy(video.videoId , {resource_type:"video"});
        await cloudinary.uploader.destroy(video.thumbnailId);
  
        await Video.findByIdAndDelete(videoId);
  
        res.status(200).json({message:"video deleted successfully"})
  
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ error: "something went wrong", message: error.message });
    }
  })
  
  // 👉🏻 Get All Videos
  
  router.get("/all" , async (req , res)=>{
    try {
      const videos = await Video.find().sort({createdAt:-1})
      res.status(200).json(videos)
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ error: "something went wrong", message: error.message });
    }
  })
  
  // 👉🏻 My Videos
  
  router.get("/my-videos" , checkAuth , async (req , res)=>{
    try {
      const videos = await Video.find({user_id:req.user._id}).sort({createdAt:-1});
      res.status(200).json(videos)
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ error: "something went wrong", message: error.message });
    }
  })
  
  // 👉🏻 Get Video by id
  router.get("/:id", checkAuth, async (req, res) => {
    try {
      const videoId = req.params.id;
      const userId = req.user._id;
  
      // Use findByIdAndUpdate to add the user ID to the viewedBy array if not already present
      const video = await Video.findByIdAndUpdate(
        videoId,
        {
          $addToSet: { viewedBy: userId },  // Add user ID to viewedBy array, avoiding duplicates
        },
        { new: true }  // Return the updated video document
      );
  
      if (!video) return res.status(404).json({ error: "Video not found" });
  
      res.status(200).json(video);
    } catch (error) {
      console.error("Fetch Error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  });
  
  //  👉🏻 Get video by category
  router.get("/category/:category", async (req, res) => {
    try {
      const videos = await Video.find({ category: req.params.category }).sort({ createdAt: -1 });
      res.status(200).json(videos);
    } catch (error) {
      console.error("Fetch Error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  });
  
  router.get("/tags/:tag", async (req, res) => {
    try {
      const tag = req.params.tag;
      const videos = await Video.find({ tags: tag }).sort({ createdAt: -1 });
      res.status(200).json(videos);
    } catch (error) {
      console.error("Fetch Error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  });
  
  // 👉🏻 Video Like
  router.post("/like" , checkAuth , async (req , res)=>{
    try {
      const {videoId} = req.body;
      
    const video =   await Video.findByIdAndUpdate(videoId , {
        $addToSet:{likedBy:req.user._id},
        $pull:{disLikedBy:req.user._id}
      })
  
      
      res.status(200).json({message:"Liked the video" , video})    
    } catch (error) {
      console.error("Fetch Error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  })
  
  
  router.post("/dislike" , checkAuth , async(req ,res)=>{
    try {
      const { videoId } = req.body;
  
      await Video.findByIdAndUpdate(videoId, {
        $addToSet: { disLikedBy: req.user._id},
        $pull: { likedBy: req.user._id }, // Remove from likes if previously liked
      });
  
      
      res.status(200).json({ message: "Disliked the video" });
    } catch (error) {
      console.error("Dislike Error:", error);
      res.status(500).json({ error: "Something went wrong" });
    }
  })


export default router;