import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Colors} from '../../core/constants';

const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Restaurant POS</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
});

export default HomeScreen;
