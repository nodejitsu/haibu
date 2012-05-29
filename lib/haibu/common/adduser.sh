#/bin/bash

#
# $USER
# $HOME
#

if [ '0' != `id -u` ]; then
   echo 'must be run as root user'
   exit 1
fi

id $USER
EXISTS=$?
if [ $EXISTS == 0 ]; then
   exit 0
fi

if command -v useradd; then
   useradd -d $HOME -m $USER
   RESULT=$?
   if [ $RESULT == 9 ]; then
     exit 0
   fi
   exit $RESULT
elif command -v adduser; then
   adduser --home $HOME --gecos $USER,na,na,na $USER
elif command -v dscl; then
   # Find out the next available user ID
   MAXID=$(dscl . -list /Users UniqueID | awk '{print $2}' | sort -ug | tail -1)
   USERID=$((MAXID+1))
   dscl . -create "/Users/$USER"
   dscl . -create "/Users/$USER" UserShell /bin/bash
   dscl . -create "/Users/$USER" RealName "$USER"
   dscl . -create "/Users/$USER" UniqueID "$USERID"
   dscl . -create "/Users/$USER" PrimaryGroupID `dscl . -list /Groups PrimaryGroupID | grep nogroup | awk '{print $2}'`
   dscl . -create "/Users/$USER" NFSHomeDirectory $HOME
   mkdir -p $HOME
else
   echo 'no known command to add user'
   exit 2
fi
