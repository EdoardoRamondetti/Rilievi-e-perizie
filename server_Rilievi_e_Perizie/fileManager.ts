import {writeFile} from "fs/promises";
import dotenv from "dotenv";
import cloudinary, { UploadApiResponse } from "cloudinary"; 
// import streamifier from 'streamifier';   

class FileManager {
	constructor(){
		dotenv.config({ path: ".env" });
		cloudinary.v2.config(JSON.parse(process.env.cloudinary!))
	}
	
	async saveBinary(filename:any, binaryBuffer:Buffer){
		//i metodi che cominciano con # sono metodi privati
		let randomName = this.#createRandomString(20)
		// L'estensione si potrebbe anche non mettere però così è più leggibile
		const ext = filename.split(".").pop();
		if (ext) randomName += "." + ext
		// Affinchè restituisca una Promise occorre importarlo da fs/promises
		// Se il file già esiste sovrascive
		await writeFile('./static/img/'+randomName, binaryBuffer)
		// in realtà ritorna una promise a cui verrà iniettato filename
		return randomName
	}	
	
	saveBase64(filename:any, imgBase64:any){
		// elimino l'intestazione \w+ = 1 o più caratteri alfanumerici
		imgBase64 = imgBase64.replace(/^data:image\/\w+;base64,/, "");
		// riconverto in binario (sincrono)
		let buffer = Buffer.from(imgBase64, "base64");
        // ritorno la promise ritornata da saveBinary
		return this.saveBinary(filename, buffer)
		/* oppure 
		let filename = await this.saveBinary(filename, buffer)
		return filename */
	}

	async saveBase64Cloudinary(imgBase64: any) {
    // Controlliamo se la stringa ha già l'intestazione, altrimenti la aggiungiamo noi per forzarla come Data URI
    const dataUri = imgBase64.startsWith('data:image') 
        ? imgBase64 
        : `data:image/jpeg;base64,${imgBase64}`;

    // Passiamo la stringa formattata correttamente a Cloudinary
    const result = await cloudinary.v2.uploader.upload(dataUri, {
        folder: "RilieviEPerizie"
    });
    
    // Restituiamo l'URL sicuro
    return result.secure_url; 
}

	saveBinaryCloudinary(filename:any, binaryBuffer:Buffer){
		return new Promise<UploadApiResponse>((resolve, reject) => {
			// configuro l'upload
			const upload = cloudinary.v2.uploader.upload_stream(
				{"folder":"Ese03upload"},
				function(error:any, result?:UploadApiResponse) {
					if(error) 
						reject(error)
					else
						resolve(result as UploadApiResponse);
		        }
		    )
			// avvio l'upload
			upload.end(binaryBuffer)
		})
		//console.log(streamifier.createReadStream(binary).constructor.name)
		//streamifier.createReadStream(binary).pipe(consumer);		
	}

	#createRandomString(len:any){
	   const chs="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	   return Array.from({length:len}, () => chs[this.#random(0,chs.length)]).join('')
	}
	
	#random(min:any, max:any){
		return Math.floor((max-min)*Math.random() + min)
	}
}
  
export default new FileManager