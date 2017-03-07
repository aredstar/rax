#!/usr/bin/env node

// Update notifications
var updateNotifier = require('update-notifier');
var pkg = require('../package.json');
updateNotifier({pkg: pkg}).notify();

// Check node version
var chalk = require('chalk');
var semver = require('semver');
if (!semver.satisfies(process.version, '>=4')) {
  var message = 'You are currently running Node.js ' +
    chalk.red(process.version) + '.\n' +
    '\n' +
    'Rax runs on Node 4.0 or newer. There are several ways to ' +
    'upgrade Node.js depending on your preference.\n' +
    '\n' +
    'nvm:       nvm install node && nvm alias default node\n' +
    'Homebrew:  brew install node\n' +
    'Installer: download the Mac .pkg from https://nodejs.org/\n';

  console.log(message);
  process.exit(1);
}

var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var spawn = require('cross-spawn');
var inquirer = require('inquirer');
var kebabcase = require('lodash.kebabcase');
var cli = require('../lib/');
var argv = require('minimist')(process.argv.slice(2));

var RAX_PACKAGE_JSON_PATH = path.resolve(
  process.cwd(),
  'node_modules',
  'rax',
  'package.json'
);

checkForVersionArgument();

// minimist api
var commands = argv._;

if (commands.length === 0) {
  console.error(
    'You did not pass any commands, did you mean to run `rax init`?'
  );
  process.exit(1);
}

switch (commands[0]) {
  case 'init':
    if (!commands[1]) {
      console.error(
      'Usage: rax init <ProjectName> [--verbose]'
    );
      process.exit(1);
    } else {
      init(commands[1], argv.verbose, argv.version);
    }
    break;
  default:
    console.error(
    'Command `%s` unrecognized.',
    commands[0]
  );
    process.exit(1);
    break;
}

function init(name, verbose, rwPackage) {
  Promise.resolve(fs.existsSync(name))
    .then(function(dirExists) {
      if (dirExists) {
        return createAfterConfirmation(name, verbose, rwPackage);
      } else {
        return;
      }
    })
    .then(function() {
      return askProjectInformaction(name, verbose, rwPackage);
    })
    .then(function(answers) {
      return createProject(name, verbose, rwPackage, answers);
    })
    .catch(function(err) {
      console.log('Error occured', err.stack);
      process.exit(1);
    });
}

function createAfterConfirmation(name, verbose, rwPackage) {
  var property = {
    type: 'confirm',
    name: 'continueWhileDirectoryExists',
    message: 'Directory ' + name + ' already exists. Continue?',
    default: false
  }

  return inquirer.prompt(property).then(function(answers) {
    if (answers && answers.continueWhileDirectoryExists) {
      return true;
    } else {
      console.log('Project initialization canceled.');
      process.exit(1);
    }
  });
}

function askProjectInformaction(name, verbose, rwPackage) {
  var questions = [
    { 
      type: 'input', 
      name: 'projectName',  
      message: 'What\'s your project name?',
      default: kebabcase(name)
    },
    {
      type: 'author',
      name: 'author',
      message: 'What\'s author\'s name?',
      default: 'rax'
    }
  ];
  return inquirer.prompt(questions);
}

function createProject(name, verbose, rwPackage, userAnswers) {
  var root = path.resolve(name);
  var projectName = userAnswers.projectName;
  var projectAuthor = userAnswers.author;

  console.log(
    'Creating a new Rax project in',
    root
  );

  if (!fs.existsSync(root)) {
    fs.mkdirSync(root);
  }
  process.chdir(root);

  cli.init({
    root: root,
    directoryName: name,
    projectName: projectName,
    projectAuthor: projectAuthor,
    verbose: verbose,
    rwPackage: rwPackage
  });
}

function checkForVersionArgument() {
  if (argv._.length === 0 && (argv.v || argv.version)) {
    console.log('rax-cli: ' + require('../package.json').version);
    try {
      console.log('rax: ' + require(RAX_PACKAGE_JSON_PATH).version);
    } catch (e) {
      console.log('rax: n/a - not inside a Rax project directory');
    }
    process.exit();
  }
}
