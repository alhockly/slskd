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


const BulkSearchList = ({list: itemMap, renderFunction}) => {

 

  return(
    
    <>
      
      <FlatList
        list={itemMap}
        renderItem={renderFunction}/>

    </>
  );
};


const areEqual = (prevProps, nextProps) => {

  return false;

};
  
  
//export default React.memo(BulkSearchList, areEqual);
 export default BulkSearchList;