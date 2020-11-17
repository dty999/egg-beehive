'use strict';
const fs = require('fs');
const path = require('path');
const config = require('../config');
let template = fs.readFileSync(path.join(__dirname, '../../', './app/router.js'), 'utf8');
// 如果config.name中带有下划线分割，则改为驼峰
const name_hump = config.name.replace(/(\w*)_(\w*)/g, function($1, $2, $3) {
  return $2 + $3[ 0 ].toUpperCase() + $3.slice(1);
});
const reg = new RegExp(`'/api/v1/${config.name}'`, 'ig');
if (template.match(reg)) {
  console.log(`router.js exist ${config.name}`);
  return;
}
let fields = `
  router.post('/api/v1/_objectName_s', controller.v1._objectNameHump_s.create);
  router.put('/api/v1/_objectName_s', controller.v1._objectNameHump_s.update);
  router.get('/api/v1/_objectName_s/list', controller.v1._objectNameHump_s.findAll);
  router.get('/api/v1/_objectName_s', controller.v1._objectNameHump_s.findOne);
  router.delete('/api/v1/_objectName_s', controller.v1._objectNameHump_s.destroy);\n};\n`;

fields = fields.replace(/_objectName_/ig, config.name);
fields = fields.replace(/_objectNameHump_/ig, name_hump);
template = template.replace(/\};\s+$/ig, fields);
// 写文件
fs.writeFileSync(path.join(__dirname, '../../', './app/router.js'), template);
console.log('router -- success');