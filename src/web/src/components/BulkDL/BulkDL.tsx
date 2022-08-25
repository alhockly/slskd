import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as searchlib from '../../lib/searches';
import * as transfers from '../../lib/transfers';
import {
  Button, Dimmer, Dropdown, List, Loader, Segment,
} from 'semantic-ui-react';
import { createSearchHubConnection } from '../../lib/hubFactory';
import Dropzone from './Dropzone';
import './Dropzone.css';
import { arraySlice, csvJSON } from './util';
import BulkSearchList from './List';


interface SearchUpdate{
  endedAt: string | number;
  id: string;
  fileCount: number;
  isComplete: boolean;
  startedAt: string;
  state: string;
}

export interface SearchItem {
  id: string;
  artist: string;
  title: string;
 // extension: string;
  results: FileResult[];
  allResults: FileResult[];
  bestMatch: FileResult | null;
  isCompleted: boolean; 
  filesFound: number;
  recheckCount: number;
  queued: boolean;
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

  const [numItems, setNumItems] = useState(0);
  const [completedItems, setCompletedItems] = useState(0);
  const [searchComplete, setSearchComplete] = useState(false);
  const [itemMap, setItemMap] = useState({});
  const [allItemsInMap, setAllItemsInMap] = useState(false);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchedItems, setBatchedItems] = useState([]);

  const batchSize = 5;
  const timeBetweenBatches = 20000;
 
  const addSearchItem = (title: string, artist: string, extension = '.mp3') => {
    if(title !=null && artist !=null){
      let itemId = uuidv4();
      let item: SearchItem = {
        id: itemId,
        title: title,
        artist: artist,
        results: [],
        // extension: extension,
        isCompleted: false,
        bestMatch: null,
        filesFound: 0,
        recheckCount: 0,
        allResults: [],
        queued: true,
      };
    
      let tmp = itemMap;
      tmp[itemId] = item;
      setItemMap(tmp);
      setNumItems(numItems + 1);
    }
  };

  const getResults = async (searchitem : SearchItem) => {

    if(searchitem.title == null){
      return;
    }
    
    const cleanArtistName = searchitem.artist.toLowerCase().replace('-', '').replace('  ',' ').replace('/','').trim();
    const cleanTrackName = searchitem.title.toLowerCase().replace('-', '').replace('  ',' ').replace('/','').trim();

    const numMatches = 20;
    var blacklist = ['bootleg', 'remix', 'rmx','mix', 'edit', 'clean'];
    blacklist = blacklist.filter(x => !searchitem.title.toLowerCase().includes(x));
    const responses = await searchlib.getResponses({ id: searchitem.id });  //responses is a list of UserShare
    let matches : FileResult[] = [];
    let allResults : FileResult[] = [];
    responses?.forEach((share : UserShare) => {
      if (share.fileCount > 0 && matches.length < numMatches) {
        share.files.every((file : FileResult) => {
          const lowercaseName = file.filename.toLowerCase();
          if (
            cleanArtistName.split(' ').every(w => lowercaseName.includes(w)) &&     //match every word seperately 
            cleanTrackName.split(' ').every(w => lowercaseName.includes(w)) &&
            !blacklist.some(element => lowercaseName.includes(element)) &&
            !file.isLocked
          ){
        
            file.username = share.username;
            file.uploadSpeed = share.uploadSpeed;
            
            if(matches.length < numMatches){
              matches.push(file);
            }

          } else {
            allResults.push(file);
          }

          return true;
        });
      }
    });
    console.log('results fetch complete');
    matches = matches?.sort((a, b) => b.bitRate - a.bitRate);

    const item: SearchItem = {
      id: searchitem.id,
      title: searchitem.title,
      artist: searchitem.artist,
      results: matches,
      bestMatch: matches[0] || null,
      // extension: searchitem.extension,
      isCompleted: true,
      filesFound: searchitem.filesFound,
      recheckCount: searchitem.recheckCount,
      allResults: allResults,
      queued: false,
    };
    setItemMap(prevState => ({...prevState,  [item.id]: item}));
    setCompletedItems(prevState => ({...prevState,  count: prevState.count + 1}) );
    
    setSearchComplete(true);
    
    if(allItemsCompleted()){
      //console.log('All items completed');
      setSearchComplete(true);
      console.log(itemMap);
      reCheckItemsWithZeroMatches();
    }
  };

  const reCheckItemsWithZeroMatches = () => {
    var wasRechecks = false;

    for (const key in itemMap) {
      if (Object.prototype.hasOwnProperty.call(itemMap, key)) {
        const element : SearchItem = itemMap[key];
        if(element.bestMatch == null && element.filesFound > 0 && element.recheckCount < 10) {
          wasRechecks = true;
          element.isCompleted = false;
          element.recheckCount = element.recheckCount + 1;
          console.log('reCHECK!');
          getResults(element);
        }
      }
    }

    if(!wasRechecks) {
      setSearchComplete(true);
      console.log('finished rechecks');
    }
  };

  const allItemsCompleted = () =>{
    for (const key in itemMap) {
      if (Object.prototype.hasOwnProperty.call(itemMap, key)) {
        const element : SearchItem = itemMap[key];
        if(element.isCompleted === false){
          // console.log('not all items completed');
          return false;
        }
      }
    }
    return true;
  };

  const numberOfItemsComplete = () => {
    var num = 0;
    for (const key in itemMap) {
      if (Object.prototype.hasOwnProperty.call(itemMap, key)) {
        const element : SearchItem = itemMap[key];
        if(element.isCompleted){
          num++;
        }
      }
    }
    return num;
  };

  const onSearchUpdate = (search : SearchUpdate) => {
    //console.log(search);

    const item: SearchItem = {
      id: search.id,
      title: itemMap[search.id]?.title,
      artist: itemMap[search.id]?.artist,
      results: [],
      bestMatch: null,
      //extension: itemMap[search.id].extension,
      isCompleted: search.isComplete,
      filesFound: search.fileCount,
      recheckCount: itemMap[search.id]?.recheckCount,
      allResults: itemMap[search.id]?.allResults,
      queued: false,
    };
    setItemMap(prevState => ({...prevState,  [search.id]: item}));
   
    if(search.isComplete){
      console.log('Search finished');
      getResults(item);
    } 
  };

 

  useEffect( () =>{
    setNumItems(0);
    setSearchComplete(false);
    
    const searchHub = createSearchHubConnection();
    searchHub.onreconnected(() => console.log('Connected'));
    searchHub.on('update', search => { onSearchUpdate(search); });
    
    const connect = async () => {
      try {
        
        await searchHub.start();
      } catch (error) {
        toast.error(error?.message ?? 'Failed to connect');
      }
      console.log('searchHub connected');
    };

    connect(); 
  },[]);



  const waitAndStart = async (index ) => {
    console.log('waiting 10 secs to start batch ' + index);
    await new Promise(r => setTimeout(r, timeBetweenBatches));
    startNextBatch(batchedItems.batched[index]);
  };

  useEffect(() => {
    if(batchedItems.length !== 0 && batchedItems != null  && batchedItems.batched[batchIndex]!= null) {
      console.log('completed ' + numberOfItemsComplete());
      
      var currentBatchsize = 1;

      //The last batch may not be equal length to the batchSize
      var currentBatch = (batchedItems.batched[batchIndex] as SearchItem[])
      currentBatchsize = currentBatch.length;   
      var completeThisBatch = Object.keys(currentBatch).map(x => itemMap[currentBatch[x].id]).filter(x => x.isCompleted).length

      if(completeThisBatch >= currentBatchsize ){
        if(batchIndex > batchedItems.length - 1) {
          console.log('all batches finished');
          setSearchComplete(true);
          return;
        }

        setBatchIndex(batchIndex +1);
        waitAndStart(batchIndex +1);
      }
    }

  },[completedItems])

  const downloadAll = () => {
    for (const key in itemMap) {
      if (Object.prototype.hasOwnProperty.call(itemMap, key)) { 
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

  const itemMapToList = () => {
    var items : SearchItem[] = [];
    for (const key in itemMap) {
      if (Object.prototype.hasOwnProperty.call(itemMap, key)) {
        const element : SearchItem = itemMap[key];
        items.push(element);
      }
    }
    return items;
  };

  const searchAllInMap = async () => {
    //start by splitting the item map in to batches
    var items : SearchItem[] = itemMapToList();
    setNumItems(items.length);
    const batched = arraySlice(items, batchSize);
    setBatchedItems(prevState => ({...prevState,  batched}));
    startNextBatch(batched[0]);
  };

  const startNextBatch = (batch) => {
    if(batch as SearchItem[]){
      batch.forEach((item) => {
        startSearch(item);
      });
    }
  };
  

  const addFilesFromSpotifyCSV = (csvJSON) => {
    csvJSON.map( song => {

      if(song.TrackName != null && song.ArtistNames != null) {
        var artist = song.ArtistNames;
        var trackName = song.TrackName.replace(/ *\([^)]*\) */g, ''); //Remove text inside brackets

        if(artist.includes(',')) {
          artist = song.ArtistNames.split(',')[0];
        }
        addSearchItem(trackName, artist);
      }
    });

    setAllItemsInMap(true);
    console.log('All items in map');
    console.log(itemMap);

    searchAllInMap();
  };

  const onDrop = useCallback(acceptedFiles => {
    setItemMap({});
    setAllItemsInMap(false);

    acceptedFiles.map(file => {
      const reader = new FileReader();
      // onload callback gets called after the reader reads the file data
      reader.onload = function(e) {
        const json  = csvJSON(e.target.result);
        addFilesFromSpotifyCSV(json);
      };
      reader.readAsText(file);
      return file;
    });

  }, []);

  const startSearch = async (searchItem : SearchItem) => {
    const text = searchItem.artist + ' ' + searchItem.title;
    await searchlib.create({ id : searchItem.id, searchText : text});
  };



  const RenderItemMapItem = (item : SearchItem) => {
    if(item.title == null){return '';}

    
    const onClickConfirm = () =>{
      if(selected == null){ selected = resultOptions[0].value; }
      console.log(selected);

      const newItem : SearchItem = {
        id: item.id,
        title: item.title,
        artist: item.artist,
        results: item.results,
        // extension: extension,
        isCompleted: item.isCompleted,
        bestMatch: selected,
        filesFound: item.filesFound,
        recheckCount: item.recheckCount,
        allResults: item.allResults,
        queued: item.queued,
      };

      setItemMap(prevState => ({...prevState,  [item.id]: newItem}));

    };

    const onClickEdit = () => {
      const newItem : SearchItem = {
        id: item.id,
        title: item.title,
        artist: item.artist,
        results: item.results,
        // extension: extension,
        isCompleted: item.isCompleted,
        bestMatch: null,
        filesFound: item.filesFound,
        recheckCount: item.recheckCount,
        allResults: item.allResults,
        queued: item.queued,
      };
      setItemMap(prevState => ({...prevState,  [item.id]: newItem}));
    };

    const resultOptions = item.allResults.map((result : FileResult) => ({value: result, key: uuidv4(), text: result.filename}));
    var selected = null;
    
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
            {!item?.isCompleted && !item.queued && (
              <Segment style={{ backgroundColor:'rgba(255,255,255,0'}}>
                <Dimmer active >
                  <Loader active size='mini'/>
                </Dimmer>
              </Segment>
            )}
            {item.queued &&(<>queued</>)}
          </div>
        </div>
        <div>
                
          <strong>best match: </strong> 
          {item?.bestMatch && (
            item?.bestMatch?.filename
          )}

          {item?.isCompleted && (
            <>
              {!item?.bestMatch && item?.allResults?.length >0 && item.filesFound > 0 ? (
                <>
                  <Dropdown
                    fluid
                    selection
                    defaultValue={resultOptions[0].value}
                    options={resultOptions}
                    onChange={(e, data) => {selected = (data.value as FileResult);}} 
                  />
                  <Button onClick={ () => onClickConfirm()}>ok</Button>
                </>
              ) : (
                <>
                  {item?.isCompleted && item?.filesFound > 0 && (
                    <Button onClick={ () => onClickEdit()}>Edit</Button>   
                  )}
                </>
              ) }
            </>   
          )}
          
        </div>
      </List.Item>
    );
  };


  return(
    <div>Bulk dl
     
      <p>Head to <Link to="https://exportify.net/">exportify.net/</Link> to export your playlist from Spotify</p>
      <br/>
      <br/>
      Number of items: {numItems}

      <br/>
      <br/>
      {searchComplete && (
        <Button onClick={() => downloadAll()}>Download All</Button>
      )}

      {!searchComplete && numItems === 0 && (
        <Dropzone onDrop={onDrop} accept={'text/csv'} />
      )}

      <BulkSearchList
        list={itemMap} renderFunction={RenderItemMapItem} />
    </div>
  );
};


export default BulkDL;