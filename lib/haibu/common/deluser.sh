#/bin/bash

#
# $USER
#

if [ '0' != `id -u` ]; then
   echo 'must be run as root user'
   exit 1
fi

if command -v useradd; then
   userdel $USER
elif command -v adduser; then
   deluser $USER
elif command -v dscl; then
   dscl . delete "/Users/$USER"
else
   echo 'no known command to delete user'
   exit 2
fi