#!/bin/sh
for f in $(find /json -type f -iname '*json')
do
  cd /jsonresume
  outfile=$(echo "${f}" | sed 's/json/html/g')
  npx resume export --theme . --resume "${f}" "${outfile}"
done
