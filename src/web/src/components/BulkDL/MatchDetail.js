import React from 'react';

export const MatchDetail = (item) => {
  return (
    <div style={{ display: 'flex', direction: 'row' }}>

      <div style={{ width: '50%' }}>
        <p>{item?.title?.title} </p>
      </div>
      <div style={{ width: '50%' }}>
        <p> files:{item?.title?.results}</p>
      </div>
    </div>
  );
};



