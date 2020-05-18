#!/usr/bin/env bash

if [ "$EUID" -ne 0 ]
  then echo "This script must be executed with root privileges."
  exit 1
fi

groupadd glassine
mkdir /var/glassine
chgrp -hR glassine /var/glassine
chmod g+xrw /var/glassine

echo "You can add yourself to the 'glassine' group by running:"
echo "sudo usermod -a -G glassine \$USER"
