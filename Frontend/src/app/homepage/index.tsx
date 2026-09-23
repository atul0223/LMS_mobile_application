import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Image,
} from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import StudentSVG from "../../../assets/images/student.svg";
import {
  FlatList,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
export default function Homepage() {
  const DATA2 = [
    {
      id: "bd7acbea-c1b1-46c2-aed5-3ad53abb28ba",
      title: "your meetings",
      image: require("../../../assets/images/course.png"),
    },
    {
      id: "3ac68afc-c605-48d3-a4f8-fbd91aa97f63",
      title: "trending",
      image: require("../../../assets/images/course.png"),
    },
    {
      id: "58694a0f-3da1-471f-bd96-145571e29d72",
      title: "Most viewed",
      image: require("../../../assets/images/course.png"),
    },
    {
      id: "58694a0f-3da1-471f-bd96-145571e29d722",
      title: "most purchased",
      image: require("../../../assets/images/course.png"),
    },
    {
      id: "58694a0f-3da1-471f-bd96-145571e29d723",
      title: "most liked",
      image: require("../../../assets/images/course.png"),
    },
  ];
  const DATA = [
    {
      id: "bd7acbea-c1b1-46c2-aed5-3ad53abb28ba",
      title: "your meetings",
    },
    {
      id: "3ac68afc-c605-48d3-a4f8-fbd91aa97f63",
      title: "trending",
    },
    {
      id: "58694a0f-3da1-471f-bd96-145571e29d72",
      title: "Most viewed",
    },
    {
      id: "58694a0f-3da1-471f-bd96-145571e29d722",
      title: "most purchased",
    },
    {
      id: "58694a0f-3da1-471f-bd96-145571e29d723",
      title: "most liked",
    },
  ];
  type ItemProps = { title: string };

  const Item = ({ title }: ItemProps) => (
    <TouchableOpacity style={styles.item}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </TouchableOpacity>
  );
  const Item2 = ({ title, image, user }: any) => (
    <View
      style={{
        width: "100%",
        borderRadius: 10,
        overflow: "hidden",
        borderWidth: 1,
        marginVertical: "2%",
        padding: "4%",
      }}
    >
      <Image source={image} style={{ resizeMode: "none", maxHeight: 200 }} />
      <View
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          flexDirection: "row",
        }}
      >
        <View style={{ flexDirection: "row", marginVertical: "4%" }}>
          <View
            style={{
              width: 45,
              height: 45,
              borderRadius: 25,
              overflow: "hidden",
              backgroundColor: "#f5ecec",
              borderWidth: 1,
              marginRight: 10,
            }}
          >
            <StudentSVG width="100%" height="100%" />
          </View>

          <View
            style={{
              flex: 1,

              overflow: "hidden",
              maxHeight: 50,
            }}
          >
            <Text>full name</Text>
            <Text numberOfLines={1}>username</Text>
          </View>
          <View style={{marginHorizontal:"2%"}}>
            <Text>50$</Text>
          </View>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={1}>
        Title : {title}
      </Text>
      <Text style={styles.title} numberOfLines={2}>
        Description : Lorem ipsum dolor sit amet consectetur adipisicing elit.
        Incidunt non temporibus quae repellat ad quia sint optio! Voluptate a
        laudantium architecto ullam quo corporis id aperiam omnis illum, optio
        vel.
      </Text>
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={DATA2}
        renderItem={({ item }) => (
          <Item2 title={item.title} image={item.image} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                maxWidth: "28%",
                borderWidth: 1,
                padding: 5,
                overflow: "hidden",
                borderRadius: 20,
              }}
            >
              <View
                style={{
                  width: 45,
                  height: 45,
                  borderRadius: 25,
                  overflow: "hidden",
                  backgroundColor: "#f5ecec",
                  borderWidth: 1,
                  marginRight: 10,
                }}
              >
                <StudentSVG width="100%" height="100%" />
              </View>
              <View
                style={{
                  flex: 1,
                  maxWidth: 50,
                  overflow: "hidden",
                  maxHeight: 50,
                }}
              >
                <Text>Hello</Text>

                <Text numberOfLines={1}>User</Text>
              </View>
            </View>

            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 2,
                borderRadius: 20,
                paddingLeft: 15,
                paddingRight: 5,
              }}
            >
              <View style={{ flex: 1 }}>
                <TextInput
                  placeholder="Search ...."
                  style={{ width: "100%", height: 51 }}
                />
              </View>

              <TouchableOpacity
                onPress={() => console.log("search pressed")}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  borderWidth: 1,
                  backgroundColor: "#FF8383",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: "bold" }}>{">"}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <FlatList
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            data={DATA}
            renderItem={({ item }) => <Item title={item.title} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 12, paddingVertical: 16 }}
          />
          </>
        }
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  item: {
    backgroundColor: "#FF8383",
    borderRadius: 10,
    paddingHorizontal: 10,
    overflow: "hidden",
    width: 150,
    paddingVertical: 5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
  },
});
