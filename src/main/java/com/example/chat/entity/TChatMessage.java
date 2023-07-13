package com.example.chat.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document
@Accessors(chain = true)
@Setter
@Getter
public class TChatMessage {
    @Id
    private String id;
    private MessageType type;
    private String content;
    private String sender;
    private String receiver;
    @JsonIgnore
    private LocalDateTime createTime;

    public enum MessageType {
        CHAT,
        JOIN,
        LEAVE
    }

}
