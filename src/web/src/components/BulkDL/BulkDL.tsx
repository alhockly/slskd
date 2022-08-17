import React, { useState, useEffect, useRef, useReducer } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useParams, useHistory, useRouteMatch, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as searchlib from '../../lib/searches';
import * as transfers from '../../lib/transfers';
import {
  Input,
  Segment,
  Button,
  Icon,
  List,
  Loader,
} from 'semantic-ui-react';
import { createSearchHubConnection } from '../../lib/hubFactory';
import { DefaultSerializer } from 'v8';
import { MatchDetail } from './MatchDetail';
import { Subject } from '@microsoft/signalr';

interface SearchResult {
  
}

interface SearchUpdate{
  endedAt: string | number;
  id: string;
  fileCount: number;
  isCompleted: boolean;
  startedAt: string;
  state: string;
}

export interface SearchItem {
  id: string;
  artist: string;
  title: string;
  extension: string;
  results: FileResult[];
  bestMatch: FileResult | null;
  isCompleted: boolean; 
}

interface FileResult{
  bitRate: number;
  filename: string;
  size: number;
  isLocked: boolean;
  length: number;
  username : string;
  uploadSpeed: number;
}

interface UserShare{
  fileCount: number;
  files: FileResult[];
  username: string;
  uploadSpeed: number;
}

const BulkDL = ({server}) => {

  const [results, setResults] = useState([]);
  const [numItems, setNumItems] = useState(0);
  const [completedItems, setCompletedItems] = useState(0);
  const [searchComplete, setSearchComplete] = useState(false);
  const [itemMap, setItemMap] = useState({});
  const [resultsMap, setResultsMap] = useState({});

  const addSearchItem = (title: string, artist: string, extension = '.mp3') => {
    let itemId = uuidv4();
    let item: SearchItem = {
      id: itemId,
      title: title,
      artist: artist,
      results: [],
      extension: extension,
      isCompleted: false,
    };
    
    setItemMap(itemMap[itemId] = item);
  };

  const getResults = async (searchitem : SearchItem) => {
    const numMatches = 20;
    const blacklist = ["bootleg", "remix"];
    const responses = await searchlib.getResponses({ id: searchitem.id });  //responses is a list of UserShare
    let matches : FileResult[] = [];
    responses?.forEach((share : UserShare) => {
      if (share.fileCount > 0 && matches.length < numMatches) {
        share.files.every((file : FileResult) => {
          const lowercaseName = file.filename.toLowerCase();
          if (lowercaseName.includes(searchitem.title.toLowerCase()) &&
              lowercaseName.includes(searchitem.artist.toLowerCase()) &&
              lowercaseName.includes(searchitem.extension.toLowerCase()) &&
              !blacklist.some(element => lowercaseName.includes(element))
          ){

            file.username = share.username;
            file.uploadSpeed = share.uploadSpeed;
            matches.push(file);
            if(matches.length > numMatches){
              return false;
            }
          }
          return true;
        });
      }
    });

    matches = matches?.sort((a, b) => b.bitRate - a.bitRate);

    
    const item: SearchItem = {
      id: searchitem.id,
      title: searchitem.title,
      artist: searchitem.artist,
      results: matches,
      bestMatch: matches[0] || null,
      extension: searchitem.extension,
      isCompleted: true,
    };
    let tmp = itemMap;
    tmp[searchitem.id] = item;
    setItemMap(tmp);
    
    if(allItemsCompleted()){
      console.log('All items completed');
      console.log(itemMap);
      setSearchComplete(true);
    
    }
  };

  const allItemsCompleted = () =>{
    for (const key in itemMap) {
      if (Object.prototype.hasOwnProperty.call(itemMap, key)) {
        const element : SearchItem = itemMap[key];
        if(element.isCompleted === false){
          return false;
        }
      }
    }
    return true;
  };

  const onSearchFinished = (search : SearchUpdate) => {
    console.log(search);
    if(search.endedAt){
      //console.log('Search finished');
      
      const item: SearchItem = {
        id: search.id,
        title: itemMap[search.id]?.title,
        artist: itemMap[search.id]?.artist,
        results: [],
        bestMatch: null,
        extension: itemMap[search.id].extension,
        isCompleted: false,
      };
    
      getResults(item);
      
    } 
  };

  useEffect( () =>{
    setNumItems(0);
    setSearchComplete(false);
    
    
    
    // updateState(null);
    //console.log(server.isConnected);
    const searchHub = createSearchHubConnection();

    searchHub.onreconnected(() => console.log('Connected'));

    searchHub.on('update', search => { onSearchFinished(search); });
    searchHub.on('ReceiveOrderUpdate', (update) => console.log(update));

    searchHub.on('newReport', (message) => console.log(message));

    const connect = async () => {
      try {
        
        await searchHub.start();
      } catch (error) {
        toast.error(error?.message ?? 'Failed to connect');
        //onConnectionError(error?.message ?? 'Failed to connect');
      }
      console.log('searchHub connected');
    };

    connect();
    
    
  },[]);


  const downloadAll = () => {
    for (const key in itemMap) {
      if (Object.prototype.hasOwnProperty.call(itemMap, key)) { 
        //TODO Might need to check the type of itemMap here for maps of 1 item
        const element : SearchItem = itemMap[key];
        if(element.bestMatch) {
          startDownload(element.bestMatch);
        }
      }
    }
  };

  const startDownload = async (match : FileResult) => {

    const requests = ([match] || []).map(({ filename, size }) => ({ filename, size }));
    
    await transfers.download({ username: match.username, files: requests });
    console.log('starting download for ' + match.toString());
  };

  const fileAddedMock = () => {
    setItemMap({});
    addSearchItem('Baby my phone', 'YAMEII');
    addSearchItem('All star','Smash mouth');
    setNumItems(2);

    for (const key in itemMap) {
      if (Object.prototype.hasOwnProperty.call(itemMap, key)) {
        const element : SearchItem = itemMap[key];
        startSearch(element);
      }
    }
  
  };

  const startSearch = async (searchItem : SearchItem) => {
    const text = searchItem.title; //  + " " + searchItem.artist + " " + searchItem.extension;
    await searchlib.create({ id : searchItem.id, searchText : text});
  };

  const renderItemMap = () => {
    const keys = Object.keys(itemMap);

    //Check for if ItemMap is only 1 entry empty (so becomes an object without dict indexing) or if ItemMap is empty
    if(itemMap.artist != undefined || Object.keys(itemMap).length == 0 ) {
      return (<>No items</>);
    }
    
    return (
      <div style={{ width: '80%', alignItems: 'center' }}>
        <List >
    
  
          {keys.map(key => 
        
          // <MatchDetail item={itemMap[key]} ></MatchDetail>
            <List.Item key={key} style={{paddingBottom: '20px', paddingTop: '20px'}}>
              <div style={{ display: 'flex', direction: 'row' }}>

                <div style={{ width: '50%' }}>
                  <p>{itemMap[key]?.artist} - {itemMap[key]?.title} </p>
                </div>
                <div style={{ width: '50%', display: 'flex', alignItems : 'center' }}>
                  <div> files: {itemMap[key]?.results?.length}
                  <Loader active={!itemMap[key]?.isCompleted} size='mini'/>
                  </div>
                </div>
              </div>
              <div>
              
                <p>best match: {itemMap[key]?.bestMatch?.filename}</p>
              </div>
          
            </List.Item>
        
          )}
        </List>
      </div>
    );
  };

  return(
    <div>Bulk dl
      <p>Head to <Link to="https://exportify.net/" >https://exportify.net/</Link> to export your playlist from Spotify</p>
      <br/>
      <br/>
      <Button
        disabled={!server?.isConnected}
        onClick={() => fileAddedMock()}>Start</Button>

      <br/>
      <br/>
      {searchComplete && (
        <Button onClick={() => downloadAll()}>Download All</Button>
      )}

      <div>
        {renderItemMap()}
      </div>
    </div>
    
        
  );
};


export default BulkDL;