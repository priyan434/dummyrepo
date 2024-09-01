'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Users', 'profileUrl', {
      type: Sequelize.STRING,
      allowNull: true // or false, depending on your requirements
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Users', 'profileUrl', {
      type: Sequelize.BLOB,
      allowNull: true // or false, depending on your requirements
    });
  }
};
