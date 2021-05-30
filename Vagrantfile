# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
	config.vm.define "dvws"
	config.vm.box = "bento/debian-10"
	config.vm.hostname = "dvws"

	config.vm.provision "basicSetup", type: "shell", inline: <<-SHELL
		export DEBIAN_FRONTEND=noninteractive
		apt-get update -y
		apt-get dist-upgrade -y
		apt-get install -y docker-compose
	SHELL

	config.vm.provision "startup", type: "shell", run: "always", inline: <<-SHELL
		cd /vagrant/
		docker-compose up -d
	SHELL

	# test whether the vm is started in ninjaDVA context
	if File.exists?("../ninjadva.rb")
		require "../ninjadva"
		NinjaDVA.new(config)
	end
end
