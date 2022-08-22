export const csvJSON = (csv) => {

  var lines=csv.split('\n');
  
  var result = [];

  
  var headers=lines[0].replaceAll(" ","").replaceAll("(","").replaceAll(")","").split(',');
  
  for(var i=1;i<lines.length;i++){
  
    var obj = {};
    var currentline=lines[i]
    var arr = currentline.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    
    for(var j=0;j<headers.length;j++){
      try{ 
        var val = arr[j].replaceAll('"','');
        obj[headers[j]] = val;
      }
      catch(e){
       // console.log("could not parse", currentline);
      }
    }
  
    result.push(obj);
  
  }
  
  return result; //JavaScript object
  
}



export const arraySlice = (array, chunkSize) => {
  
  var chunks = []
  for (let i = 0; i < array.length; i += chunkSize) {
      const chunk = array.slice(i, i + chunkSize);
      chunks.push(chunk);
  }

  return chunks;

}