import React from 'react';
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

export default BulkSearchList;