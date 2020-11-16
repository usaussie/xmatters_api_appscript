# Appscript & xMatters REST API #

This appscript code queries some of the endpoints provided by [xMatters](https://www.xmatters.com/), and writes the results back to a google sheet. The google sheet can then be used for reporting, dashboarding etc.

### How do I get set up? ###

1. Create a user in xMatters, and give it the "REST Web Service" role (you'll need the password for it too)
2. Create a google sheet with 3 tabs (people, groups, group_rosters)
3. Create a project via script.google.com
4. Copy the code from this repo's Code.gs into the Code.gs provided
5. Update the variables at the top of the script and save.
6. Run the "set_all_sheet_headers()" function, which will prompt you to provide access to your google account (so it can write results to a sheet)
7. Check your google sheet, and see that it added a header row to all 3 tabs.
8. Run the individual getPeople(), getGroups() and getGroupRosters() functions.
9. Check the google sheet and see the data from your xMatters users, groups, and rosters included

Optional:

* Set up a trigger to run each of the 3 get() functions once per week/month for automated reporting.

### API Reference ###

* [xMatters REST API Documentation](https://help.xmatters.com/xmapi/index.html#xmatters-rest-api)


### Author ###

* Nick Young
* [@techupover](https://twitter.com/techupover)
* [Medium](http://usaussie.medium.com)
