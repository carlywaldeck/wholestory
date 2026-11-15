import {computeLearning} from "../lib/learning-compute";
import type {LearningTask} from "../lib/learning-types";
self.onmessage=(event:MessageEvent<LearningTask>)=>{try{self.postMessage({ok:true,bundle:computeLearning(event.data)});}catch(error){self.postMessage({ok:false,error:error instanceof Error?error.message:"Local learning failed."});}};
