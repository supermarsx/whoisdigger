export default {"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<h4 class='title is-4 has-text-centered'>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"options_heading",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":1,"column":41},"end":{"line":1,"column":64}}}))
    + "</h4>\n<h5>\n  "
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"options_desc_1",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":3,"column":2},"end":{"line":3,"column":24}}}))
    + "<br />\n  "
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"options_desc_2",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":4,"column":2},"end":{"line":4,"column":24}}}))
    + "\n</h5>\n<hr />\n<p id='settings-not-loaded' class='has-text-warning is-hidden'>\n  "
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"settings_not_loaded",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":8,"column":2},"end":{"line":8,"column":29}}}))
    + "\n</p>\n<table id='configStats' class='table is-narrow is-fullwidth mb-2'>\n  <tbody>\n    <tr>\n      <th>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"config_file_path",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":13,"column":10},"end":{"line":13,"column":34}}}))
    + "</th>\n      <td id='stat-config-path'></td>\n    </tr>\n    <tr>\n      <th>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"config_file_size",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":17,"column":10},"end":{"line":17,"column":34}}}))
    + "</th>\n      <td id='stat-config-size'></td>\n    </tr>\n    <tr>\n      <th>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"loaded",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":21,"column":10},"end":{"line":21,"column":24}}}))
    + "</th>\n      <td id='stat-config-loaded'></td>\n    </tr>\n    <tr>\n      <th>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"last_modified",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":25,"column":10},"end":{"line":25,"column":31}}}))
    + "</th>\n      <td id='stat-config-mtime'></td>\n    </tr>\n    <tr>\n      <th>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"permissions",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":29,"column":10},"end":{"line":29,"column":29}}}))
    + "</th>\n      <td id='stat-config-perms'></td>\n    </tr>\n    <tr>\n      <th>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"data_folder_path",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":33,"column":10},"end":{"line":33,"column":34}}}))
    + "</th>\n      <td id='stat-data-path'></td>\n    </tr>\n    <tr>\n      <th>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"data_folder_size",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":37,"column":10},"end":{"line":37,"column":34}}}))
    + "</th>\n      <td id='stat-data-size'></td>\n    </tr>\n  </tbody>\n</table>\n<div id='opActions' class='field is-grouped is-grouped-multiline mb-2'>\n  <p class='control has-icons-left is-expanded'>\n    <input\n      id='opSearch'\n      class='input is-small'\n      type='text'\n      placeholder='"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"search_placeholder",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":48,"column":19},"end":{"line":48,"column":45}}}))
    + "'\n    />\n    <span class='icon is-small is-left'><i class='fas fa-search'></i></span>\n  </p>\n  <p class='control'>\n    <button id='restoreDefaults' class='button is-small is-danger'>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"restore_defaults",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":53,"column":67},"end":{"line":53,"column":91}}}))
    + "</button>\n  </p>\n  <p class='control'>\n    <button id='reloadSettings' class='button is-small is-info'>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"reload",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":56,"column":64},"end":{"line":56,"column":78}}}))
    + "</button>\n  </p>\n  <p class='control'>\n    <button id='saveConfig' class='button is-small is-success'>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"save",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":59,"column":63},"end":{"line":59,"column":75}}}))
    + "</button>\n  </p>\n  <p class='control'>\n    <button id='openDataFolder' class='button is-small is-info'>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"open_data_folder",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":62,"column":64},"end":{"line":62,"column":88}}}))
    + "</button>\n  </p>\n  <p class='control'>\n    <button id='downloadModel' class='button is-small is-info'>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"download_model",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":65,"column":63},"end":{"line":65,"column":85}}}))
    + "</button>\n  </p>\n  <p class='control'>\n    <button id='reloadApp' class='button is-small is-warning'>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"reload_app",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":68,"column":62},"end":{"line":68,"column":80}}}))
    + "</button>\n  </p>\n  <p class='control'>\n    <button id='deleteConfig' class='button is-small is-danger'>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"delete_config",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":71,"column":64},"end":{"line":71,"column":85}}}))
    + "</button>\n  </p>\n</div>\n<p id='opSearchNoResults' class='has-text-centered is-hidden'>\n  "
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"no_config_found",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":75,"column":2},"end":{"line":75,"column":25}}}))
    + "\n</p>\n<table id='opTable' class='table is-striped is-hoverable is-fullwidth has-text-left'></table>\n<h4 class='title is-4 mt-5'>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"history_heading",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":78,"column":28},"end":{"line":78,"column":51}}}))
    + "</h4>\n<table id='historyTable' class='table is-striped is-hoverable is-fullwidth has-text-left'>\n  <thead>\n    <tr>\n      <th>Domain</th>\n      <th>Status</th>\n      <th>Timestamp</th>\n    </tr>\n  </thead>\n  <tbody></tbody>\n</table>\n<p id='historyEmpty' class='has-text-centered is-hidden'>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"history_empty",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":89,"column":57},"end":{"line":89,"column":78}}}))
    + "</p>\n<p class='control'>\n  <button id='clearHistory' class='button is-small is-danger'>"
    + alias3((lookupProperty(helpers,"t")||(depth0 && lookupProperty(depth0,"t"))||alias2).call(alias1,"clear_history",{"name":"t","hash":{},"data":data,"loc":{"start":{"line":91,"column":62},"end":{"line":91,"column":83}}}))
    + "</button>\n</p>\n<button id='opBackToTop' class='button is-info is-small back-to-top'>\n  <span class='icon is-small'>\n    <i class='fas fa-arrow-up'></i>\n  </span>\n</button>\n<button id='opGoToBottom' class='button is-info is-small go-to-bottom'>\n  <span class='icon is-small'>\n    <i class='fas fa-arrow-down'></i>\n  </span>\n</button>\n";
},"useData":true};
