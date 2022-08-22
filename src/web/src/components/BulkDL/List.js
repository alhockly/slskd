import React, { useState } from 'react';
import {
  Segment,
  List,
  Loader,
  Dimmer, 
  Button,
} from 'semantic-ui-react';
import './Dropzone.css';
import FlatList from 'flatlist-react';

const RenderItemMapItem = (item) => {
  console.log('rendering');

  if(item.title == null){return '';}

  var selectedItem = '';
  var textColour  = item?.filesFound >0 ? 'black' : 'rgba(0, 0, 0, 0.3)';
  return (
    <List.Item key={item?.id} style={{padding: '10px',
      margin:'10px', backgroundColor: 'grey', borderRadius: '5px', color: textColour}}>
      <div style={{ display: 'flex', direction: 'row' }}>

        <div style={{ width: '70%' }}>
          <p style={{fontSize: '20px'}}>{item?.artist} - {item?.title} </p>
        </div>
        <div style={{ display: 'flex', alignItems : 'center' }}>
          <div style={{paddingTop:10}}> files: {item?.filesFound}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems : 'center', marginLeft:10 }}>
          <Segment style={{ backgroundColor:'rgba(255,255,255,0'}}>
            <Dimmer active={!item?.isCompleted && !item.queued} >
              <Loader active={!item?.isCompleted} size='mini'/>
            </Dimmer>
          </Segment>
          {item.queued &&(<>queued</>)}
        </div>
      </div>
      <div>
              
        <strong>best match: </strong> 
          
        {item?.bestMatch && (
          item?.bestMatch?.filename
          
        )}

        {!item?.bestMatch && item?.allResults?.length >0 && item.filesFound > 0 ? (
          <>
            <select value={selectedItem}>
              {item.allResults.map((result) => (
                <option key={result.filename} value={result}>{result.filename}</option>
              ))}
            </select>
            <Button>ok</Button>
          </>
        ) : (<>
          <Button>edit</Button>
        </>
        ) }

        
          
         
      </div>
    </List.Item>
  );
};


const BulkSearchList = ({list: itemMap}) => {


  return(
    
    <>
      
      <FlatList
        list={itemMap}
        renderItem={RenderItemMapItem}/>

       
    </>
  );
};


const areEqual = (prevProps, nextProps) => {

  return false;

};
  
  
// export default React.memo(BulkSearchList, areEqual);
export default BulkSearchList;