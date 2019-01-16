# whois-ux 

node.js whois utility to retrive whois infromation

## Install

Install with [npm](http://github.com/xreader/whois):

    npm install whois-ux 

## Usage

```
var whois = require('./whois');

whois.whois('139.130.4.5', function (err, data){
	console.log(JSON.stringify(data));
});
```
output of this call

```
whois {
    "NetRange": "139.130.0.0 - 139.130.255.255",
    "CIDR": "139.130.0.0/16",
    "OriginAS": "",
    "NetName": "APNIC-ERX-139-130-0-0",
    "NetHandle": "NET-139-130-0-0-1",
    "Parent": "NET-139-0-0-0-0",
    "NetType": "Early Registrations, Transferred to APNIC",
    "Comment": "spam or abuse reports relating to these addresses.  For more",
    "RegDate": "",
    "Updated": "2012-01-24",
    "OrgName": "Asia Pacific Network Information Centre",
    "OrgId": "APNIC",
    "Address": "PO Box 3646",
    "City": "South Brisbane",
    "StateProv": "QLD",
    "PostalCode": "4101",
    "Country": "AU",
    "OrgTechHandle": "AWC12-ARIN",
    "OrgTechName": "APNIC Whois Contact",
    "OrgTechPhone": "+61 7 3858 3188",
    "OrgTechEmail": "search-apnic-not-arin@apnic.net",
    "OrgAbuseHandle": "AWC12-ARIN",
    "OrgAbuseName": "APNIC Whois Contact",
    "OrgAbusePhone": "+61 7 3858 3188",
    "OrgAbuseEmail": "search-apnic-not-arin@apnic.net",
    "inetnum": "139.130.0.0 - 139.130.255.255",
    "netname": "TELSTRAINTERNET35-AU",
    "descr": "ACT 2601",
    "country": "AU",
    "admin-c": "TIAR-AP",
    "tech-c": "TIAR-AP",
    "mnt-by": "MAINT-AU-TIAR-AP",
    "mnt-lower": "MAINT-AU-TIAR-AP",
    "remarks": "Telstra Internet Address Registry Role Object",
    "status": "ALLOCATED PORTABLE",
    "mnt-irt": "IRT-TELSTRA-AU",
    "changed": "hm-changed@apnic.net 20050310",
    "source": "APNIC",
    "irt": "IRT-TELSTRA-AU",
    "address": "ACT 2601",
    "e-mail": "addressing@telstra.net",
    "abuse-mailbox": "IRT@team.telstra.com",
    "auth": "# Filtered",
    "person": "Telstra Internet Address Registry",
    "phone": "+61 3 9815 5923",
    "nic-hdl": "TIAR-AP"
}
```

##Testing

```
node test.js
```
