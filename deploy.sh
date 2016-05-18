#!/bin/bash

git add --all
git commit -m "Change for deployment."
git push heroku master
