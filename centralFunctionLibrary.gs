/* Function Library for Google form workflows by Kevin Turner */

// The google sheet GID to use for global logs
PropertiesService.getScriptProperties().setProperty('formLogID', '1TdyzldF0mDxaZ8I4E4-FaYgVguv-YSlkY4GaopQ0mCE');

// Simple email template
PropertiesService.getScriptProperties().setProperty('templateSimple', 'https://s3-ap-southeast-2.amazonaws.com/danebank-cdn/email-templates/gform-email-simple/gformEmailTemplate.html');

// Approve Graphic
PropertiesService.getScriptProperties().setProperty('approveImg', 'https://s3-ap-southeast-2.amazonaws.com/danebank-cdn/email-confirmations-graphics/ThumbsUp.jpg');

// Deny Graphic
PropertiesService.getScriptProperties().setProperty('denyImg', 'https://s3-ap-southeast-2.amazonaws.com/danebank-cdn/email-confirmations-graphics/ThumbsDown.jpg');

// Pending Graphic
PropertiesService.getScriptProperties().setProperty('pendingImg', 'https://s3-ap-southeast-2.amazonaws.com/danebank-cdn/email-confirmations-graphics/Pending.jpg');

// Helpdesk / support email address
PropertiesService.getScriptProperties().setProperty('supportEmail', 'helpdesk@danebank.nsw.edu.au');


// Central log sheet logger
function logSheet(dat,err) {
  var formName = SpreadsheetApp.getActiveSpreadsheet().getName().replace(" (Responses)","");
  var formLog = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('formLogID')).getActiveSheet();
  formLog.insertRows(2);
  formLog.getRange(2,1).setValue(new Date());
  formLog.getRange(2,2).setValue(formName);
  
  if(err=="2") { formLog.getRange(2,3).setValue(dat + " " + err).setFontWeight("bold").setFontColor("red"); } // error format
  else { formLog.getRange(2,3).setValue(dat).setFontWeight("normal").setFontColor("black"); } // normal log format
}

// Specify names and web published URLs of available email Templates
// n.b. HTML must contain HEADERBLOCK, BODYBLOCK and FOOTERBLOCK to be replaced by dynamic content
function getEmailTemplateURL(template) {
  switch (template)    
  {
    case "Simple":
      return PropertiesService.getScriptProperties().getProperty('templateSimple');
      break;
    case "undefined":
      return PropertiesService.getScriptProperties().getProperty('templateSimple');
      break;
    default:
      return PropertiesService.getScriptProperties().getProperty('templateSimple');
      break;
    }
}
// requires an array of sheet display values, the column title "Confirmation Sent"/"Approval 1"/"Email Sent"/"Approval 1 By"/"Approval 2"/"Approval 2 By"/"Workflow Status"
function getWorkflowColumn(sheetData,columnTitle,lastCol) {
  for(i=0; i<lastCol; i++) {
    if(sheetData[0][i] == columnTitle) {
      return i + 1;
    }
  }
  return "unknown";
}

// returns the GID of the global log google sheet
function getLogGID() {
  return PropertiesService.getScriptProperties().getProperty('formLogID');
}

// Create columns in active sheet depending on workflow type passed
function createWorkflowColumns(workflowType) {
  // !!ATN create checks to make sure columns don't already exist
  var ss1 = SpreadsheetApp.getActiveSheet();
  ss1.getRange(1,ss1.getLastColumn()+1).setValue("Confirmation Sent").setFontWeight("bold").setHorizontalAlignment("center").setFontColor("white").setBackground('black');
  ss1.getRange(1,ss1.getLastColumn()+1).setValue("Email Sent").setFontWeight("bold").setHorizontalAlignment("center").setFontColor("white").setBackground('black');
  
  // For single Approval workflows or greater
  if(workflowType >= 2) {
    ss1.getRange(1,ss1.getLastColumn()+1).setValue("Approval 1").setFontWeight("bold").setHorizontalAlignment("center").setFontColor("white").setBackground('black');
    ss1.getRange(1,ss1.getLastColumn()+1).setValue("Approval 1 By").setFontWeight("bold").setHorizontalAlignment("center").setFontColor("white").setBackground('black');
  }
  
  // For double Approval workflows or greater
  if(workflowType >= 3) {
    ss1.getRange(1,ss1.getLastColumn()+1).setValue("Approval 2").setFontWeight("bold").setHorizontalAlignment("center").setFontColor("white").setBackground('black');
    ss1.getRange(1,ss1.getLastColumn()+1).setValue("Approval 2 By").setFontWeight("bold").setHorizontalAlignment("center").setFontColor("white").setBackground('black');
  }
  
  ss1.getRange(1,ss1.getLastColumn()+1).setValue("Workflow Status").setFontWeight("bold").setHorizontalAlignment("center").setFontColor("white").setBackground('black');
  // need to create a value in the column to automatically calculate workflow status based on workflow type and status of other columns
}

// returns the row number for the rowID (for google forms defaulting to timestamp)
function getRowID(sheetData,rowID,lastRow) {
  var i,value;
  for(i=0; i<lastRow; i++) {
    if(sheetData[i][0] == rowID) {
      return i + 1;
    }
  }
  return "unknown";
}

// requires ("true"/"false","text"/"colour")
function getApprovalAttribute(approved, attr) {
  if(approved == "true" && attr == "text") { return "Approved"; }
  if(approved == "true" && attr == "colour") { return "Green"; }
  if(approved == "false" && attr == "text") { return "Denied"; }
  if(approved == "false" && attr == "colour") { return "Red"; } 
  return "unknown";
}

// Transforms submitted form data into a formatted HTML table
function passFormDataToHTML(e,columns) {
  var blockHTML = "<table cellpadding=\"5\" cellspacing=\"10\">";
  for (var keys in columns) { // Process form submission data
    var key = columns[keys];
    var val = e.namedValues[key] ? e.namedValues[key].toString() : "";
    if (val !== "") { // Only include form values that are not blank
      blockHTML += "<tr><td style=\"width: 20%; background-color: #f9f2ec;\">" + key + "</td><td>" + val + "</td></tr>";
    }
  }
  blockHTML += "</table>";
  return blockHTML;
}

// Returns HTML buttons within a table to approve/deny row data
// Requires a 'recordID' (such as timestamp), a 'docID' as google sheet GUID for writing back to, an 'initID' as the email of the initiating email
// and 'data' as an array of key value pairs (must include 'source' and recipient email pair)
function approvalPostButtons(recordID, docID, webappID, initID, approvalSource, data) {
  var result;
  result = "<table width=\"100%\"><tr>";
  
  // Approval button
  result += "<td style=\"text-align: right;\"><form action=\"" + webappID + "\" method=\"post\">";
  result += "<input type=\"hidden\" name=\"approve\" value=\"true\" />";
  result += "<input type=\"hidden\" name=\"recordID\" value=\"" + recordID + "\" />"; // timestamp in this instance
  result += "<input type=\"hidden\" name=\"docID\" value=\"" + docID + "\" />"; // document for approval to write back to
  result += "<input type=\"hidden\" name=\"" + data[0] + "\" value=\"" + data[1] + "\" />"; // !! need to fix with loop, this is the 'custom data'
  result += "<input type=\"submit\" value=\"Approve\" style=\"text-decoration:none; color: #ffffff;background: lightgreen; font-family: sans-serif; font-size: 20px; padding-top:10px;padding-bottom:10px;padding-right:20px;padding-left:20px; background-image: -webkit-linear-gradient(top, lightgreen, green); background-image: -moz-linear-gradient(top, lightgreen, green); background-image: -ms-linear-gradient(top, lightgreen, green); background-image: -o-linear-gradient(top, lightgreen, green); background-image: linear-gradient(to bottom, lightgreen, green);\"></form></td>";
  
  // Spacer
  //result += "<td> </td>";
  
  // Deny button
  result += "<td style=\"text-align: left;\"><form action=\"" + webappID + "\" method=\"post\">";
  result += "<input type=\"hidden\" name=\"approve\" value=\"true\" />";
  result += "<input type=\"hidden\" name=\"recordID\" value=\"" + recordID + "\" />"; // timestamp in this instance
  result += "<input type=\"hidden\" name=\"docID\" value=\"" + docID + "\" />"; // document for approval to write back to
  result += "<input type=\"hidden\" name=\"" + data[0] + "\" value=\"" + data[1] + "\" />"; // !! need to fix with loop, this is the 'custom data'
  result += "<input type=\"submit\" value=\"Deny\" style=\"color: #ffffff;background: red; font-family: sans-serif; font-size: 20px; padding-top:10px;padding-bottom:10px;padding-right:35px;padding-left:35px; background-image: -webkit-linear-gradient(top, red, darkred); background-image: -moz-linear-gradient(top, red, darkred); background-image: -ms-linear-gradient(top, red, darkred); background-image: -o-linear-gradient(top, red, darkred); background-image: linear-gradient(to bottom,  red, darkred);\"></form></td>";
														
  // Buttons EOF
  result += "</tr></table>";
  return result;
}

// Returns HTML buttons within a table to approve/deny row data
// Requires a 'recordID' (such as timestamp), a 'docID' as google sheet GUID for writing back to, an 'initID' as the email of the initiating email
// and 'data' as an array of key value pairs (must include 'source' and recipient email pair)
function approvalGetButtons(recordID, docID, webappID, initID, approvalSource, data) {
  var result;
  result = "<br><table width=\"100%\"><tr>";
  
  // Approve button
  result += "<td style=\"text-align: right; padding-right: 5px; padding-left: 5px;\">";
  result += "<a href=\"" + webappID;
  
  // Add html get variables to parse for Approve
  result += "?approve=true";
  result += "&recordID=" + recordID;
  result += "&docID=" + docID;
  result += "&initID=" + initID;
  result += "&approvalSource=" + approvalSource;
  result += "\" onMouseOver=\"this.style.background='#66CD00'\" onMouseOut=\"this.style.background='#61B329'\" style=\"text-decoration:none; color: #ffffff; background: #61B329; font-family: sans-serif; font-size: 20px; text-align: center; padding-top:10px;padding-bottom:10px;padding-right:20px;padding-left:20px;\">Approve</a></td>";
  
  // Deny Button
  result += "<td style=\"text-align: left; padding-right: 5px; padding-left: 5px;\">";
  result += "<a href=\"" + webappID;
  
  // Add html get variables to parse for Deny
  result += "?approve=false";
  result += "&recordID=" + recordID;
  result += "&docID=" + docID;
  result += "&initID=" + initID;
  result += "&approvalSource=" + approvalSource;
  result += "\" onMouseOver=\"this.style.background='#F80000'\" onMouseOut=\"this.style.background='#D00000'\" style=\"text-decoration:none; color: #ffffff; background: #D00000; font-family: sans-serif; font-size: 20px; text-align: center; padding-top:10px;padding-bottom:10px;padding-right:35px;padding-left:35px;\">Deny</a></td>";												
  
  // Buttons EOF
  result += "</tr></table>";
  return result;
}

function approvalStatusButton(recordID, docID, webappID, initID, approvalSource, data) {
  var result;
  result = "<table width=\"100%\"><tr>";
  
  // Check Status button
  result += "<td style=\"text-align: center; padding-right: 5px; padding-left: 5px; padding-top: 5px;\">";
  result += "<a href=\"" + webappID;
  result += "?approve=status";
  result += "&recordID=" + recordID;
  result += "&docID=" + docID;
  result += "&initID=" + initID;
  result += "&approvalSource=" + initID;
  result += "\" onMouseOver=\"this.style.background='darkorange'\" onMouseOut=\"this.style.background='orange'\" style=\"text-decoration:none; color: #ffffff; background: orange; font-family: sans-serif; font-size: 20px; text-align: center; padding-top:10px;padding-bottom:10px;padding-right:35px;padding-left:35px;\">Check Status</a></td>";
  result += "</tr></table>";
  return result;
}

// Returns a table for an HTML confirmation message
function genConfTable(formCommsName, approvalClause) {
  var confTable = "<table width=\"100%\"><tr>";
  //confTable += "<td style=\"text-align: center; color: gray; background-color: #ffefe8;\">";
  confTable += "<td style=\"text-align: center; color: gray;\">";
  confTable += "This is a confirmation email for your " + formCommsName + " submission";
  confTable += approvalClause + "</td></tr></table>";
  return confTable;
}

// Returns a thank you page HTML for approval responses
function getThankYouPage(approve, formCommsName) {
  var supportEmail = PropertiesService.getScriptProperties().getProperty('supportEmail');
  var approvalGraphic, approvalName, approvalColour;
  if (approve == "true") {
    approvalGraphic = PropertiesService.getScriptProperties().getProperty('approveImg');
    approvalName = "approved";
    approvalColour = "green";
  }
  else {
    approvalGraphic = PropertiesService.getScriptProperties().getProperty('denyImg');
    approvalName = "denied";
    approvalColour = "red";
  }
  var thankYouHTML = "<table width=\"100%\" height=\"100%\"><tr>";
  thankYouHTML += "<td style=\"vertical-align: top; text-align: center; color: gray; font-family: sans-serif;\"><br><br><br><br>";
  thankYouHTML += "<img src=\"" + approvalGraphic + "\"></img>";
  thankYouHTML += "<p style=\"font-size: 40px;\">Form <strong style=\"Color: " + approvalColour + ";\">" + approvalName + "</strong>, thank you!</p>";
  thankYouHTML += "<p style=\"font-size: 24px;\"><strong>You may change this approval</strong> at any time until the form has been finalised.</p><p ><hr width=\"60%\"></p>";
  thankYouHTML += "<p style=\"font-size: 24px;\">Having trouble? <a href=\"mailto:" + supportEmail + "?subject=Problem with Form Approval/Denial from " + formCommsName + "\" target=\"_blank\">Contact the helpdesk</a></p>";
  thankYouHTML += "</td></tr></table>";
  return thankYouHTML;
}

// Returns a status page for users to check on their submission's workflow status
function getStatusPage(status, formCommsName) {
  var supportEmail = PropertiesService.getScriptProperties().getProperty('supportEmail');
  var statusColour, statusImg;
  switch (status)
  {
    case "Completed - Approved":  
      statusColour = "green";
      statusImg = PropertiesService.getScriptProperties().getProperty('approveImg');
      break;
    case "Completed - Denied":
      statusColour = "red";
      statusImg = PropertiesService.getScriptProperties().getProperty('denyImg');
      break;
    default:
      statusColour = "orange";
      statusImg = PropertiesService.getScriptProperties().getProperty('pendingImg');
      break;
  }
  var statusHTML = "<table width=\"100%\" height=\"100%\"><tr>";
  statusHTML += "<td style=\"vertical-align: top; text-align: center; color: gray; font-family: sans-serif;\"><br><br><br><br>";
  statusHTML += "<img src=\"" + statusImg + "\"></img>";
  statusHTML += "<p style=\"font-size: 40px;\">Your <strong>" + formCommsName + "</strong> submission status:</p>";
  statusHTML += "<p style=\"font-size: 40px;\"><strong style=\"Color: " + statusColour + ";\">" + status + "</strong></p>";
  statusHTML += "<p style=\"font-size: 24px;\"><strong>Please contact the appropriate party</strong> for further information.</p><p ><hr width=\"60%\"></p>";
  statusHTML += "<p style=\"font-size: 24px;\">Having trouble? <a href=\"mailto:" + supportEmail + "?subject=Problem with Form Approval/Denial from " + formCommsName + "\" target=\"_blank\">Contact the helpdesk</a></p>";
  statusHTML += "</td></tr></table>";
  return statusHTML;
}

function getWorkflowName(workflowType) {
  switch (workflowType)
    {
        case 2:
            return "Single Approval";
            break;
        case 3:
            return "Double Approval";
            break;
        default:
            return "Simple Submission";
            break;
    }
}

function getWorkflowStageName(workflowStage) {
  switch (workflowStage)
    {
        case 2:
            return "Approval 1";
            break;
        case 3:
            return "Approval 2";
            break;
        default:
            return "Initial Submission";
            break;
    }
}