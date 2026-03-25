import {v4 as uuidv4} from "uuid";

export const registerController = async (request, reply)=>{
    const{name} = request.body;
    const{email} = request.body;
    const{password} = request.body;
    

}

export const loginController = async(request, reply) =>{
    const{email} = request.body;
    const{password} = request.body;


}

export const meController = async(request, reply) ={
    
}