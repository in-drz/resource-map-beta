function import_data_rr() {

  /* The code below opens the spreadsheet that is populated by Google Form Responses, which include:
      1. Resource Responder Responses
      2. Bag Donation Responses
      3. Google Voice Phone Responses
*/
  //The lines of code below access the current spreadsheet, Realtime Sheet, and its corresponding sheets.
  var source_sheet = SpreadsheetApp.openById("1HUsCIM21S4Sy2RAZwBep0yPFCkrZxGNK6RQDC8QbwoQ");
  var destination_sheet = SpreadsheetApp.getActiveSpreadsheet();
  
  //The lines of code below access the different sheets from our source sheet and store them as variables
  var sheet_rr = source_sheet.getSheets()[0];
  
  //The lines below access the source sheet and the ranges we are importing.
  var source_rr_data= sheet_rr.getRange('A2:J100').getValues();

  var destination_sheet_rr = destination_sheet.getSheetByName('resource_responders');

  //The lines below create an empty array.
  var transformedData = [];

  // loop through the source data and transform as needed
  for (var i = 0; i < source_rr_data.length; i++) {
  
    if (i === 0) continue;

    // map individual columns and transform the data as needed
    var transformedRow = [
      source_rr_data[i][1].charAt(0).toUpperCase() + source_rr_data[i][1].slice(1), // map column B
      source_rr_data[i][2],// map column C and multiply by 2
      source_rr_data[i][3], // map column D and convert to uppercase
      source_rr_data[i][4], // map column E
      source_rr_data[i][5],
      source_rr_data[i][7],
      source_rr_data[i][6] + "; " + source_rr_data[i][8]
    ];
    
  
    if (transformedRow[4] === 'I can be a drop-off location') {
        transformedRow[4] = 'Drop-Off';
      }
      else if (transformedRow[4] === 'I can pick-up from people within a reasonable distance (see next q to specify).') {
        transformedRow[4] = 'Pick-Up';
      }
      else if (transformedRow[4] === "I'm up for either!") {
        transformedRow[4] = 'Both';
      };

    if (transformedRow[5] === '2 mi') {
      transformedRow[5] = 2;
    }
    else if (transformedRow[5] === '2.5 or more miles') {
      transformedRow[5] = 2.5;
    }
    else if (transformedRow[5] === '.5 mi') {
      transformedRow[5] = .5;
    }
    else if (transformedRow[5] === '1 mi') {
      transformedRow[5] = 1;
    };

    transformedData.push(transformedRow); // add the transformed row to the array

    
  }

  // set the size of the transformed data
  var numTransformedRows = transformedData.length;
  var numTransformedColumns = transformedData[0].length;

  //The lines below access the current spreadsheet (which will be linked to Mapbox), and specifies which ranges we will be targeting.
  var destinationrange_rr_name = destination_sheet_rr.getRange(2, 1, numTransformedRows, numTransformedColumns);
  destinationrange_rr_name.setValues(transformedData);

 

};
