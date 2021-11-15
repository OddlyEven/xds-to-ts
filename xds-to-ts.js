/*
  Compile: 	npm run build
  Run:			npm run start account-details-reponse.xsd
*/
/* https://www.npmjs.com/package/jsdom */
const jsdom = require('jsdom');
const fs = require('fs');
const args = process.argv.slice(2);
const xmlFilePath = args[0];
const outputFilePath = args[1];
class ModuleWorker {
    constructor() {
        this.modules = {};
    }
    convertToInterfaces(xmlStr) {
        const doc = new jsdom.JSDOM(xmlStr, { contentType: 'application/xml' });
        this.modules = {};
        this.parseXML(doc.window.document.documentElement);
        return this.buildModules();
    }
    parseXML(node, existingClass) {
        if (node.children.length > 0) {
            Array.from(node.children).forEach((childNode) => {
                const attrName = childNode.getAttribute('name') || '';
                switch (childNode.nodeName.toLowerCase()) {
                    case 'xs:complextype':
                        if (attrName) {
                            this.modules[attrName] = Object.assign({}, this.modules[attrName]);
                            existingClass = this.modules[attrName];
                        }
                        this.parseXML(childNode, existingClass);
                        break;
                    case 'xs:sequence':
                    case 'xs:all':
                        this.parseXML(childNode, existingClass);
                        break;
                    case 'xs:element':
                        if (childNode.getAttribute('type')) {
                            let fieldType = childNode.getAttribute('type') || '';
                            fieldType = fieldType.replace('xs:', '').replace('res:', '');
                            switch (fieldType.toLowerCase()) {
                                case 'int':
                                case 'unsignedbyte':
                                case 'decimal':
                                case 'double':
                                    fieldType = 'number';
                                    break;
                                case 'datetime':
                                case 'date':
                                    fieldType = 'Date';
                                    break;
                                default:
                                    break;
                            }
                            existingClass[attrName] = fieldType;
                        }
                        else {
                            this.modules[attrName] = Object.assign({}, this.modules[attrName]);
                            this.parseXML(childNode, this.modules[attrName]);
                        }
                        break;
                    default:
                        // console.log('SOMETHING WENT WRONG: ', attrName);
                        this.parseXML(childNode);
                        break;
                }
            });
        }
    }
    buildModules() {
        // const moduleContent = ['/* eslint-disable no-use-before-define */\n/* eslint-disable @typescript-eslint/naming-convention */\n/* eslint-disable max-lines */'];
        const moduleContent = ['/* eslint-disable no-use-before-define */'];
        Object.entries(this.modules).forEach(([key, val]) => {
            const props = [];
            Object.entries(val).forEach(([propKey, propType]) => {
                props.push(`\t ${propKey}: ${propType};`);
            });
            moduleContent.push(`export interface ${key} { \n ${props.join("\n")} \n }`);
        });
        return moduleContent.join("\n\n");
    }
}
if (xmlFilePath) {
    console.clear();
    fs.readFile(xmlFilePath, 'utf8', (err, xmlStr) => {
        if (err) {
            console.log('ERROR:', err);
            return;
        }
        const worker = new ModuleWorker();
        const content = worker.convertToInterfaces(xmlStr);
        if (outputFilePath) {
            fs.writeFile(outputFilePath, content, err => {
                if (err) {
                    console.error(err);
                    return;
                }
                console.log('done.');
            });
        }
        else {
            console.log(content);
        }
    });
}
