var xmatters_rest_user = "api_user";
var xmatters_rest_password = "something-long-and-secure";
var xm_pagination_per_page = 100;
var url_prefix = "https://yourdomain.xmatters.com"; // no trailing slash

// Google Sheet URL that you have access to edit (should be blank to begin with)
var GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/your-sheet-id/edit";
// tab/sheet name to house the list of File IDs for everything in your Google Drive
var GOOGLE_SHEET_RESULTS_TAB_NAME_PEOPLE = "people";
var GOOGLE_SHEET_RESULTS_TAB_NAME_GROUPS = "groups";
var GOOGLE_SHEET_RESULTS_TAB_NAME_GROUP_ROSTERS = "group_rosters";


/*
*
* DO NOT CHANGE ANYTHING BELOW THIS LINE
*
*/

function set_all_sheet_headers() {

  set_sheet_headers_people();
  set_sheet_headers_groups();
  set_sheet_headers_group_rosters();

}

function set_sheet_headers_people() {
  
  var results_sheet = SpreadsheetApp.openByUrl(GOOGLE_SHEET_URL).getSheetByName(GOOGLE_SHEET_RESULTS_TAB_NAME_PEOPLE);
  results_sheet.appendRow(["audit_date","id", "targetName", "recipientType", "externallyOwned", "firstName", "lastName", "language", "timezone", "webLogin", "whenCreated", "whenUpdated", "lastLogin", "status", 'supervisor_count', 'supervisor_targetName', 'supervisor_firstName', 'supervisor_lastName', 'supervisor_webLogin' ]);

}

function set_sheet_headers_groups() {
  
  var results_sheet = SpreadsheetApp.openByUrl(GOOGLE_SHEET_URL).getSheetByName(GOOGLE_SHEET_RESULTS_TAB_NAME_GROUPS);
  results_sheet.appendRow(["audit_date","id", "targetName", "recipientType", "externallyOwned", "status", "allowDuplicates", "useDefaultDevices", "observedByAll", "description"]);

}

function set_sheet_headers_group_rosters() {
  
  var results_sheet = SpreadsheetApp.openByUrl(GOOGLE_SHEET_URL).getSheetByName(GOOGLE_SHEET_RESULTS_TAB_NAME_GROUP_ROSTERS);
  results_sheet.appendRow(["audit_date","group_id", "group_targetName", "group_recipientType", "member_id", "member_targetName", "member_firstName", "member_lastName", "member_recipientType"]);

}

function setApiHeaders() {

  return {
      "Content-Type": "Content-Type: application/json",
      "Authorization": "Basic "+ Utilities.base64Encode(xmatters_rest_user+":"+xmatters_rest_password)
  };

}

function getGroups() {

  var this_api = xm_api_groups();
  var data = do_paginated_api_call(this_api.url, this_api.method);
  var thisDate = new Date();
  var normalized_data = [];
  
  Object.entries(data).forEach(([key, xmJsonData]) => {
      
      newRow = [
        thisDate,
        xmJsonData.id,
        xmJsonData.targetName,
        xmJsonData.recipientType,
        xmJsonData.externallyOwned,
        xmJsonData.status,
        xmJsonData.allowDuplicates,
        xmJsonData.useDefaultDevices,
        xmJsonData.observedByAll,
        xmJsonData.description        
      ];
      
      //console.log(newRow);

      normalized_data.push(newRow);

  })

  //Logger.log(my_data);
  writeDataToGoogleSheet(GOOGLE_SHEET_URL, GOOGLE_SHEET_RESULTS_TAB_NAME_GROUPS, normalized_data);

}

function getGroupRosters() {

  // get all group IDs first, then get all members next
  
  var this_api = xm_api_groups();
  var data = do_paginated_api_call(this_api.url, this_api.method);
  var thisDate = new Date();
  var group_data = [];
  
  Object.entries(data).forEach(([key, xmJsonData]) => {
      
      newRow = [
        xmJsonData.id,
      ];
      
      //console.log(newRow);
      //console.log(xmJsonData.targetName);

      group_data.push(newRow);

  })

  var normalized_data = [];
  Logger.log('Retrieving rosters for ' + group_data.length + ' groups.');
  
  // now go get group rosters for each
  for (var i = 0; i < group_data.length; i++) {

    var roster_api_url = this_api.url + '/' + group_data[i] + '/members';
    
    var roster_data = do_paginated_api_call(roster_api_url, this_api.method);
    
    //console.log(roster_data);
    //Logger.log('Retrieving roster for Group ID: ' + group_data[i]);
    
    Object.entries(roster_data).forEach(([key, xmJsonData]) => {
        
        newRow = [
          thisDate,
          xmJsonData.group.id,
          xmJsonData.group.targetName,
          xmJsonData.group.recipientType,
          xmJsonData.member.id,
          xmJsonData.member.targetName,
          xmJsonData.member.firstName,
          xmJsonData.member.lastName,
          xmJsonData.member.recipientType        
        ];
        
        //console.log(newRow);

        normalized_data.push(newRow);

    })

  }

  //Logger.log(my_data);
  writeDataToGoogleSheet(GOOGLE_SHEET_URL, GOOGLE_SHEET_RESULTS_TAB_NAME_GROUP_ROSTERS, normalized_data);

}




function getPeople() {

  var this_api = xm_api_people();
  var data = do_paginated_api_call(this_api.url, this_api.method);
  var thisDate = new Date();

  // because the people API returns different number of keys in the results, we need to normalize the array
  // this is currently (as of 11/13/20) because the lastLogin field is not returned if the user has never logged in.
  // IE: the returned json may be: [ ..., site, whenCreated, whenUpdated, .. ] vs [ ..., site, lastLogin, whenCreated, whenUpdated, .. ]

  // loop throw each returned person, and add a lastLogin=NULL entry to their info
  var normalized_data = [];
  
  Object.entries(data).forEach(([key, xmJsonData]) => {
      
      // do an extra call to get the supervisor and role info
      var person_api_url = this_api.url + '/' + xmJsonData.id + '/supervisors';
      var supervisor_data = do_paginated_api_call(person_api_url, this_api.method);

      //console.log(supervisor_data.length);
      var numberOfSupervisors = supervisor_data.length;
      var thisSupervisorTargetName = [];
      var thisSupervisorFirstName = [];
      var thisSupervisorLastName = [];
      var thisSupervisorWebLogin = [];
      
      Object.entries(supervisor_data).forEach(([key, xmSupervisorData]) => {
        //console.log(xmSupervisorData);

        thisSupervisorTargetName.push(xmSupervisorData.targetName);
        thisSupervisorFirstName.push(xmSupervisorData.firstName);
        thisSupervisorLastName.push(xmSupervisorData.lastName);
        thisSupervisorWebLogin.push(xmSupervisorData.webLogin);

      });

      var combinedSupervisorTargetName = thisSupervisorTargetName.join();
      var combinedSupervisorFirstName = thisSupervisorFirstName.join();
      var combinedSupervisorLastName = thisSupervisorLastName.join();
      var combinedSupervisorWebLogin = thisSupervisorWebLogin.join();
      
      // Need to check for the lastLogin value, which is present for some users but not others
      // I think this has to do with local xMatters logins, rather than SSO logins
      var lastLoginValue = 'NULL';
      if(xmJsonData.lastLogin !== undefined) {
          lastLoginValue = xmJsonData.lastLogin;
      }
      
      newRow = [
        thisDate,
        xmJsonData.id,
        xmJsonData.targetName,
        xmJsonData.recipientType,
        xmJsonData.externallyOwned,
        xmJsonData.firstName,
        xmJsonData.lastName,
        xmJsonData.language,
        xmJsonData.timezone,
        xmJsonData.webLogin,
        xmJsonData.whenCreated,
        xmJsonData.whenUpdated,
        lastLoginValue,
        xmJsonData.status,
        numberOfSupervisors,
        combinedSupervisorTargetName,
        combinedSupervisorFirstName,
        combinedSupervisorLastName,
        combinedSupervisorWebLogin
      ];
      
      //console.log(newRow);

      normalized_data.push(newRow);

  })

  //Logger.log(my_data);
  writeDataToGoogleSheet(GOOGLE_SHEET_URL, GOOGLE_SHEET_RESULTS_TAB_NAME_PEOPLE, normalized_data);

}

function writeDataToGoogleSheet(sheet_url, tab_name, data) {

  var newRow = [];
  var rowsToWrite = [];

  for (var i = 0; i < data.length; i++) {

    // define an array of all the object keys
    var headerRow = Object.keys(data[i]);

    // define an array of all the object values
    var newRow = headerRow.map(function(key){ return data[i][key]});

    // add to row array instead of append because append is SLOOOOOWWWWW
    rowsToWrite.push(newRow);

  }

  // select the range and set its values
  var ss = SpreadsheetApp.openByUrl(sheet_url).getSheetByName(tab_name);
  ss.getRange(ss.getLastRow() + 1, 1, rowsToWrite.length, rowsToWrite[0].length).setValues(rowsToWrite);

}

function do_paginated_api_call(endpoint, method) {
  // set some variables
  const baseUrl = url_prefix + endpoint + '?limit=' + xm_pagination_per_page + '&offset='; 
  
  let offset = 0;
  // create empty array where we want to store the people objects for each loop
  let return_data = [];
  // create a lastResult array which is going to be used to check if there is a next page
  let lastResult = [];

  var i = 0;

  do {
    // try catch to catch any errors in the async api call
    try {
            
      var headers = setApiHeaders();

      var options = {
          "method" : method,
          "headers" : headers 
      };

      //console.log('XM_ENDPOINT: ' + baseUrl + offset,options);

      response = UrlFetchApp.fetch(baseUrl + offset,options);
      
      //console.log(response);
      
      var response_json = JSON.parse(response.getContentText());

      lastResult = response_json;
      
      for (const [key, value] of Object.entries(response_json.data)) {
        return_data.push(value);
      }
      
      // add to the offset
      offset = offset + xm_pagination_per_page;


    } catch (err) {
      console.error(`EXCEPTION THROWN: ${err}`);
      return;
    }
    // keep running until there's no next page

    i++;

  } while (lastResult.links.next !== undefined);
  //} while (i < 2);
  
  //Logger.log(return_data);
  return return_data;

}

function xm_api_people()
{
  
  endpoint_info = {};
  endpoint_info.url = '/api/xm/1/people';
  endpoint_info.method = 'get';

  return endpoint_info;
  
}

function xm_api_groups()
{
  
  endpoint_info = {};
  //endpoint_info.url = '/groups?members.exists=ANY_SHIFTS';
  endpoint_info.url = '/api/xm/1/groups';
  endpoint_info.method = 'get';

  return endpoint_info;
  
}



