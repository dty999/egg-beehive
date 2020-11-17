'use strict';
module.exports = app => {
  const Sequelize = app.Sequelize;

  const user = app.model.define('users', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    username: Sequelize.STRING(60),
    nickname: Sequelize.STRING(60),
    password: Sequelize.STRING(64),
    email: Sequelize.STRING(60),
    state: Sequelize.TINYINT,
    phone: Sequelize.STRING(15),
    avatar: Sequelize.STRING(255),
    last_login: Sequelize.DATE,
  }, {
    paranoid: true,
  });
  user.associate = function(models) {
    // associations can be defined here
    app.model.Users.belongsToMany(app.model.Roles, {
      through: app.model.UserRoles,
      foreignKey: 'user_id',
      otherKey: 'role_id',
    });
  };
  return user;
};